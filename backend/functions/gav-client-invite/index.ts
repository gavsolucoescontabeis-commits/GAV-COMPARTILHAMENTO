import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,"Content-Type":"application/json"}});
const db=createClient(Deno.env.get("SUPABASE_URL")!,
 (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
 {auth:{persistSession:false,autoRefreshToken:false}});
function fail(message:string,status=400):never{throw {message,status}}
function check<T=any>(r:{data:T,error:any}):T{if(r.error)fail("Não foi possível preparar o convite.",502);return r.data}
async function clientAccount(email:string){
 for(let page=1;page<=25;page++){
  const r=await db.auth.admin.listUsers({page,perPage:1000});
  if(r.error)fail("Falha ao conferir acesso.",502);
  const user=r.data.users.find((u:any)=>u.email?.toLowerCase()===email);
  if(user)return user;
  if(r.data.users.length<1000)break;
 }
 return null;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||(req.headers.get("origin")&&req.headers.get("origin")!==origin))
   fail("Solicitação não permitida.",403);
  const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  if(!jwt)fail("Acesso GAV necessário.",401);
  const {data:{user},error}=await db.auth.getUser(jwt);
  if(error||!user||user.email?.toLowerCase()!=="gavsolucoescontabeis@gmail.com"||
    !user.email_confirmed_at||!user.app_metadata?.providers?.includes("google"))
   fail("Somente administração GAV.",403);
  const admin=check(await db.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle());
  if(!admin)fail("Administração inativa.",403);
  const b=await req.json();
  if(b.action!=="create")fail("Ação inválida.",400);
  const companyId=String(b.companyId||"");
  if(!/^[0-9a-f-]{36}$/i.test(companyId))fail("Empresa inválida.",400);
  const company=check(await db.from("gav_companies").select("id,cnpj,legal_name")
   .eq("id",companyId).eq("is_active",true).maybeSingle());
  if(!company)fail("Empresa não cadastrada.",404);
  const folder=check(await db.from("gav_drive_folders").select("id")
   .eq("company_id",companyId).eq("is_active",true).maybeSingle());
  if(!folder)fail("Pasta no Drive ainda não autorizada.",409);
  const existing=await clientAccount("cliente-"+company.cnpj+"@acesso.gavsolucoescontabeis.com.br");
  if(existing){
   if(existing.app_metadata?.gav_test_account||existing.app_metadata?.gav_account_kind!=="client"||
     existing.app_metadata?.gav_company_id!==companyId)
    fail("Conta de teste ou não reconhecida. Confira o acesso antes de emitir convite.",409);
   const membership=check(await db.from("gav_memberships").select("company_id,password_change_required").eq("user_id",existing.id));
   if(!membership.some((m:any)=>m.company_id===companyId)||
     (!membership.some((m:any)=>m.company_id===companyId&&m.password_change_required)&&existing.app_metadata?.gav_password_change_required!==true))
    fail("O cliente já possui senha definitiva. Este convite serve para o primeiro acesso.",409);
  }
  const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
  const raw=Array.from(bytes,(v:number)=>v.toString(16).padStart(2,"0")).join("");
  const hashBytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)));
  const hash=Array.from(hashBytes,(v:number)=>v.toString(16).padStart(2,"0")).join("");
  const expiresAt=new Date(Date.now()+7*86400000).toISOString();
  check(await db.from("gav_client_invites").update({revoked_at:new Date().toISOString()})
   .eq("company_id",companyId).is("used_at",null).is("revoked_at",null));
  check(await db.from("gav_client_invites").insert({company_id:companyId,token_hash:hash,
   created_by:user.id,expires_at:expiresAt}));
  check(await db.from("gav_audit_events").insert({actor_user_id:user.id,company_id:companyId,
   action:"CLIENT_INVITE_CREATED"}));
  return reply({ok:true,cnpj:company.cnpj,expiresAt,
   inviteUrl:"https://gavsolucoescontabeis-commits.github.io/GAV-COMPARTILHAMENTO/#convite="+raw});
 }catch(e:any){return reply({error:String(e?.message||"Falha ao emitir convite.")},e?.status||500)}
});
