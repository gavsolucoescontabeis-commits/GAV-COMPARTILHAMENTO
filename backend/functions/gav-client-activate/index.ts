import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";

const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,"Content-Type":"application/json"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,
  (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
  {auth:{persistSession:false,autoRefreshToken:false}});
function fail(message:string,status=400):never{throw {message,status}}
function check<T=any>(r:{data:T,error:any}):T{if(r.error){console.error("activation db",r.error.code);fail("Serviço indisponível. Solicite um novo convite à GAV.",502)}return r.data}
const hex=(bytes:Uint8Array)=>Array.from(bytes,(v:number)=>v.toString(16).padStart(2,"0")).join("");
async function tokenHash(token:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))))}
async function findClient(email:string){
 for(let page=1;page<=25;page++){
  const r=await db.auth.admin.listUsers({page,perPage:1000});
  if(r.error)fail("Não foi possível confirmar o cadastro.",502);
  const u=r.data.users.find((x:any)=>x.email?.toLowerCase()===email);
  if(u)return u;
  if(r.data.users.length<1000)break;
 }
 return null;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST")fail("Método inválido.",405);
  if(req.headers.get("origin")!==origin)fail("Origem não autorizada.",403);
  if(Number(req.headers.get("content-length")||0)>4096)fail("Solicitação muito grande.",413);
  const b=await req.json();
  const action=String(b.action||""),token=String(b.token||""),cnpj=String(b.cnpj||"").replace(/\D/g,"");
  if(!["inspect","activate"].includes(action)||!/^[0-9a-f]{64}$/.test(token)||!/^\d{14}$/.test(cnpj))fail("Convite inválido ou expirado.",403);
  const hash=await tokenHash(token);
  const now=new Date().toISOString();
  const invite=check(await db.from("gav_client_invites").select("id,company_id,expires_at")
   .eq("token_hash",hash).is("used_at",null).is("revoked_at",null).gt("expires_at",now).maybeSingle());
  if(!invite)fail("Este convite expirou ou já foi utilizado. Solicite outro à GAV.",410);
  const company=check(await db.from("gav_companies").select("id,cnpj,legal_name,is_active")
   .eq("id",invite.company_id).eq("cnpj",cnpj).eq("is_active",true).maybeSingle());
  if(!company)fail("Não foi possível validar os dados deste convite.",403);
  const folder=check(await db.from("gav_drive_folders").select("id").eq("company_id",company.id).eq("is_active",true).maybeSingle());
  if(!folder)fail("Empresa sem pasta autorizada. Entre em contato com a GAV.",409);
  const email="cliente-"+cnpj+"@acesso.gavsolucoescontabeis.com.br";
  const existing=await findClient(email);
  if(existing&&(existing.app_metadata?.gav_test_account||
    existing.app_metadata?.gav_account_kind!=="client"||
    existing.app_metadata?.gav_company_id!==company.id))
     fail("O cadastro desta empresa precisa ser conferido pela GAV.",409);
  if(existing){
   const member=check(await db.from("gav_memberships").select("company_id,active,password_change_required").eq("user_id",existing.id));
   if(!member.some((x:any)=>x.company_id===company.id))fail("Cadastro inconsistente. Procure a GAV.",409);
   if(!member.some((x:any)=>x.company_id===company.id&&x.password_change_required)&&!existing.app_metadata?.gav_password_change_required)
     fail("Esta empresa já possui senha cadastrada. Entre com a sua senha ou procure a GAV.",409);
  }
  if(action==="inspect")return reply({ok:true,legalName:company.legal_name,cnpj:company.cnpj,expiresAt:invite.expires_at});
  const password=String(b.password||"");
  if(password.length<12||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))
   fail("Use uma senha de 12 a 128 caracteres, com letras e números.",400);
  // Consumo atômico: duas chamadas simultâneas não podem ativar o mesmo convite.
  const consumed=check(await db.from("gav_client_invites")
   .update({used_at:new Date().toISOString()}).eq("id",invite.id)
   .is("used_at",null).is("revoked_at",null).gt("expires_at",new Date().toISOString()).select("id"));
  if(consumed.length!==1)fail("Este convite já foi utilizado.",410);
  const at=new Date().toISOString();
  const meta={...(existing?.app_metadata||{}),gav_account_kind:"client",gav_company_id:company.id,
   gav_password_change_required:false,gav_password_changed_at:at,gav_invite_activated_at:at};
  let uid:string,createdId:string|null=null;
  if(existing){
   const updated=await db.auth.admin.updateUserById(existing.id,{password,app_metadata:meta});
   if(updated.error)fail("Falha ao cadastrar senha. Solicite novo convite à GAV.",502);
   uid=existing.id;
  }else{
   const created=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:meta});
   if(created.error||!created.data.user)fail("Falha ao criar acesso. Solicite novo convite à GAV.",502);
   uid=created.data.user.id;createdId=uid;
  }
  const membership=await db.from("gav_memberships").upsert({
   user_id:uid,company_id:company.id,active:true,password_change_required:false
  },{onConflict:"user_id,company_id"});
  if(membership.error){
   console.error("activation membership",membership.error.code);
   if(createdId)await db.auth.admin.deleteUser(createdId);
   fail("Falha ao concluir o acesso. Solicite novo convite à GAV.",502);
  }
  check(await db.from("gav_memberships").update({password_change_required:false}).eq("user_id",uid));
  const audit=await db.from("gav_audit_events").insert({actor_user_id:uid,company_id:company.id,action:"CLIENT_INVITE_ACTIVATED"});
  if(audit.error)console.error("activation audit",audit.error.code);
  return reply({ok:true,activated:true});
 }catch(e:any){return reply({error:String(e?.message||"Falha ao ativar convite.")},e?.status||500)}
});
