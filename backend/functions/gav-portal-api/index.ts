import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.76.1";
const SUPABASE_API_URL=Deno.env.get("SUPABASE_URL")!;
const KEY=(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
const owner="gavsolucoescontabeis@gmail.com";
const supa=createClient(SUPABASE_API_URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={"Access-Control-Allow-Origin":"https://gavsolucoescontabeis-commits.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const reply=(v:any,status=200)=>new Response(JSON.stringify(v),{status,headers:{"Content-Type":"application/json",...headers}});
const error=(text:string,status=400)=>{throw {message:text,status}};
const check=(r:any)=>{if(r.error)error("Falha no banco de dados.",502);return r.data};
async function google(path:string,token:string,query:any={}){
 const u=new URL("https://www.googleapis.com/drive/v3/"+path);
 for(const [k,v] of Object.entries(query))u.searchParams.set(k,String(v));
 const r=await fetch(u,{headers:{Authorization:"Bearer "+token}});
 if(!r.ok)error("Google Drive não autorizou a consulta ("+r.status+").",502);
 return r.json();
}
async function tokenFrom(body:any,admin:boolean){
 if(body.googleToken&&admin)return String(body.googleToken);
 const cid=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!cid||!secret)error("Configure GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET nos segredos do Supabase.",409);
 const refresh=check(await supa.rpc("gav_read_drive_refresh"));
 if(!refresh)error("Conecte o Google Drive pela conta GAV.",409);
 const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:cid,client_secret:secret,grant_type:"refresh_token",refresh_token:refresh})});
 if(!res.ok)error("Renove a autorização do Drive pela conta GAV.",409);
 return (await res.json()).access_token;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply({error:"Método inválido."},405);
 if(req.headers.get("origin")&&req.headers.get("origin")!=="https://gavsolucoescontabeis-commits.github.io")return reply({error:"Origem não autorizada."},403);
 try{
  const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  if(!jwt)error("Entre na sua conta.",401);
  const {data:{user},error:authError}=await supa.auth.getUser(jwt);
  if(authError||!user)error("Sessão inválida.",401);
  const googleUser=user.app_metadata?.providers?.includes("google")&&user.email_confirmed_at;
  const isOwner=user.email?.toLowerCase()===owner&&!!googleUser;
  if(isOwner)check(await supa.from("gav_admin_users").upsert({user_id:user.id,active:true},{onConflict:"user_id"}));
  const adminRows=check(await supa.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true));
  const isAdmin=!!isOwner&&adminRows.length>0;
  const members=check(await supa.from("gav_memberships").select("company_id").eq("user_id",user.id).eq("active",true));
  const companyIds=members.map((m:any)=>m.company_id);
  const b=await req.json(),action=String(b.action||""),companyId=String(b.companyId||"");
  const adminOnly=()=>{if(!isAdmin)error("Somente administrador GAV.",403)};
  const companyOnly=()=>{if(!isAdmin&&!companyIds.includes(companyId))error("Empresa não autorizada.",403)};
  if(action==="me"){
   const companies=isAdmin?check(await supa.from("gav_companies").select("id,code,cnpj,legal_name,folder_label,office_id,is_active").order("code")):companyIds.length?check(await supa.from("gav_companies").select("id,code,cnpj,legal_name,folder_label,office_id,is_active").in("id",companyIds)):[];
   const linked=isAdmin?check(await supa.from("gav_drive_folders").select("company_id,is_active,auto_publish_new").eq("is_active",true)):[];
   const candidate=isAdmin?check(await supa.from("gav_drive_candidates").select("company_id,label,verified_at")):[];
   return reply({role:isAdmin?"admin":"client",companies,linked,candidate,driveSecretsConfigured:!!(Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")&&Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET"))});
  }
  if(action==="documents"){
   companyOnly();
   let q=supa.from("gav_documents").select("id,company_id,file_name,mime_type,relative_path,category,year,month,review_status,published_at").eq("company_id",companyId).neq("review_status","REMOVIDO").order("file_name");
   if(!isAdmin)q=q.eq("review_status","APROVADO").not("published_at","is",null);
   return reply({documents:check(await q.limit(1000))});
  }
  if(action==="clientPreview"){
   adminOnly();
   const company=check(await supa.from("gav_companies").select("id,is_active").eq("id",companyId).eq("is_active",true).maybeSingle());
   if(!company)error("Empresa não encontrada ou inativa.",404);
   const documents=check(await supa.from("gav_documents")
     .select("id,company_id,file_name,mime_type,relative_path,category,year,month,review_status,published_at")
     .eq("company_id",companyId).eq("review_status","APROVADO").not("published_at","is",null).order("file_name").limit(1000));
   return reply({documents,preview:true});
  }
  if(action==="createPilotTestAccess"||action==="removePilotTestAccess"){
   adminOnly();
   const pilot=check(await supa.from("gav_companies").select("id,cnpj,is_active").eq("cnpj","60955798000157").eq("is_active",true).single());
   if(companyId!==pilot.id)error("Acesso de teste permitido apenas para a empresa-piloto.",403);
   const email="cliente-"+pilot.cnpj+"@acesso.gavsolucoescontabeis.com.br";
   const users=await supa.auth.admin.listUsers({page:1,perPage:1000});
   if(users.error)error("Não foi possível conferir o usuário de teste.",502);
   const existing=users.data.users.find((x:any)=>x.email?.toLowerCase()===email);
   if(existing&&!existing.app_metadata?.gav_test_account)error("Já existe um acesso real para esse CNPJ. Não será alterado.",409);
   if(action==="removePilotTestAccess"){
    if(existing){
     const removed=await supa.auth.admin.deleteUser(existing.id);
     if(removed.error)error("Não foi possível remover a conta de teste.",502);
    }
    return reply({removed:true});
   }
   const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
   const random=new Uint8Array(32);crypto.getRandomValues(random);
   const password=Array.from(random,(v:number)=>alphabet[v%alphabet.length]).join("");
   let userId:string;
   if(existing){
    const changed=await supa.auth.admin.updateUserById(existing.id,{password});
    if(changed.error)error("Não foi possível renovar a senha de teste.",502);
    userId=existing.id;
   }else{
    const created=await supa.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{gav_test_account:true}});
    if(created.error||!created.data.user)error("Não foi possível criar a conta de teste.",502);
    userId=created.data.user.id;
   }
   const membership=await supa.from("gav_memberships").upsert({user_id:userId,company_id:companyId,active:true},{onConflict:"user_id,company_id"});
   if(membership.error)error("Falha ao conceder acesso apenas à empresa-piloto.",502);
   return reply({cnpj:pilot.cnpj,password,test:true});
  }
  if(action==="connectDrive"){
   adminOnly();
   if(typeof b.refreshToken!=="string"||b.refreshToken.length<20)error("Google não forneceu autorização offline. Reconecte com consentimento.",409);
   check(await supa.rpc("gav_store_drive_refresh",{p_refresh:b.refreshToken}));
   return reply({connected:true});
  }
  if(action==="linkPilot"){
   adminOnly();
   const c=check(await supa.from("gav_drive_candidates").select("*").eq("company_id",companyId).maybeSingle());
   if(!c)error("Pasta-piloto não pré-aprovada.",404);
   const token=await tokenFrom(b,isAdmin);
   const folder=await google("files/"+encodeURIComponent(c.folder_id),token,{fields:"id,name,mimeType,parents,trashed",supportsAllDrives:true});
   if(folder.trashed||folder.mimeType!=="application/vnd.google-apps.folder"||folder.name!==c.label||!folder.parents?.includes(c.expected_parent_id))error("Pasta não confere com a TTM. Nada foi publicado.",409);
   const link=check(await supa.from("gav_drive_folders").upsert({company_id:companyId,drive_folder_id:c.folder_id,drive_parent_id:c.expected_parent_id,approved_by:user.id,is_active:true},{onConflict:"company_id,drive_folder_id"}).select());
   check(await supa.from("gav_drive_candidates").update({verified_at:new Date().toISOString()}).eq("company_id",companyId));
   return reply({folder:folder.name,linked:link.length});
  }
  if(action==="publishMonth"||action==="revokeMonth"){
   adminOnly();
   const y=Number(b.year),m=Number(b.month),c=String(b.category||"");
   if(!["FOLHA","ADMISSOES","RESCISOES","FERIAS","GUIAS_IMPOSTOS","OUTROS"].includes(c)||!Number.isInteger(y)||y<2000||y>2100||!Number.isInteger(m)||m<1||m>13)error("Selecione uma pasta mensal válida.",400);
   const linked=check(await supa.from("gav_drive_folders").select("id").eq("company_id",companyId).eq("is_active",true));
   if(!linked.length)error("Empresa sem pasta autorizada.",409);
   const folders=linked.map((v:any)=>v.id);
   const rows=check(await supa.from("gav_documents").select("id").eq("company_id",companyId).eq("category",c).eq("year",y).eq("month",m).in("drive_folder_link_id",folders).limit(500));
   if(!rows.length)error("Não há arquivos nessa competência.",404);
   const ids=rows.map((v:any)=>v.id);
   const changes=action==="publishMonth"?{review_status:"APROVADO",published_at:new Date().toISOString()}:{review_status:"BLOQUEADO",published_at:null};
   const result=check(await supa.from("gav_documents").update(changes).eq("company_id",companyId).in("id",ids).select("id"));
   return reply({ok:true,updated:result.length});
  }
  if(action==="publish"||action==="unpublish"){
   adminOnly();
   const d=check(await supa.from("gav_documents").select("id,drive_folder_link_id").eq("id",b.documentId).eq("company_id",companyId).maybeSingle());
   if(!d)error("Documento não encontrado.",404);
   const link=check(await supa.from("gav_drive_folders").select("id").eq("id",d.drive_folder_link_id).eq("is_active",true).maybeSingle());
   if(!link)error("Pasta desativada.",403);
   check(await supa.from("gav_documents").update(action==="publish"?{review_status:"APROVADO",published_at:new Date().toISOString()}:{review_status:"BLOQUEADO",published_at:null}).eq("id",d.id));
   return reply({ok:true});
  }
  error("Ação não encontrada.",404);
 }catch(e:any){return reply({error:String(e.message||"Falha interna.")},e.status||500)}
});