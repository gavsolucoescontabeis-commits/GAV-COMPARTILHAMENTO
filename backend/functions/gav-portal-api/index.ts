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

async function gavClientUser(email:string){
 for(let page=1;page<=25;page++){
  const r=await supa.auth.admin.listUsers({page,perPage:1000});
  if(r.error)error("Falha na consulta dos acessos.",502);
  const u=(r.data.users||[]).find((x:any)=>x.email?.toLowerCase()===email);
  if(u)return u;
  if((r.data.users||[]).length<1000)break;
 }
 return null;
}
function gavNewPassword(){
 const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
 const buf=new Uint8Array(28);crypto.getRandomValues(buf);
 return Array.from(buf,(x:number)=>chars[x%chars.length]).join("");
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
  const members=check(await supa.from("gav_memberships").select("company_id,password_change_required").eq("user_id",user.id).eq("active",true));
  const companyIds=members.map((m:any)=>m.company_id);
  const b=await req.json(),action=String(b.action||""),companyId=String(b.companyId||"");
  const adminOnly=()=>{if(!isAdmin)error("Somente administrador GAV.",403)};
  const companyOnly=()=>{if(!isAdmin&&!companyIds.includes(companyId))error("Empresa não autorizada.",403)};

  const changeRequired=!isAdmin&&(user.app_metadata?.gav_password_change_required===true||members.some((m:any)=>m.password_change_required));
  if(action==="changeClientPassword"){
   if(isAdmin||user.app_metadata?.gav_account_kind!=="client"||
     !companyIds.includes(String(user.app_metadata?.gav_company_id||"")))
     error("Acesso de cliente não autorizado.",403);
   const password=String(b.password||"");
   if(password.length<12||password.length>128||!/[a-zA-Z]/.test(password)||!/[0-9]/.test(password))
     error("Use uma senha com pelo menos 12 caracteres, incluindo letras e números.",400);
   const issuedAt=Date.parse(String(user.app_metadata?.gav_password_issued_at||""));
   const signedAt=Date.parse(String(user.last_sign_in_at||""));
   if(Number.isFinite(issuedAt)&&(!Number.isFinite(signedAt)||signedAt<=issuedAt))
     error("Saia e entre novamente com a senha provisória antes de escolher uma nova senha.",403);
   const updated=await supa.auth.admin.updateUserById(user.id,
    {password,app_metadata:{...user.app_metadata,gav_password_change_required:false,gav_password_changed_at:new Date().toISOString()}});
   if(updated.error)error("Não foi possível alterar a senha. Tente novamente.",502);
   check(await supa.from("gav_memberships").update({password_change_required:false}).eq("user_id",user.id));
   return reply({ok:true});
  }
  
  // Ligação individual autorizada: não presumir vínculo por sócio, nome ou escritório.
  if(action==="linkClientCompany"||action==="unlinkClientCompany"){
   adminOnly();
   const targetCompanyId=String(b.targetCompanyId||"");
   if(!/^[0-9a-f-]{36}$/i.test(companyId)||!/^[0-9a-f-]{36}$/i.test(targetCompanyId)||companyId===targetCompanyId)
     error("Selecione duas empresas distintas.",400);
   const firms=check(await supa.from("gav_companies").select("id,cnpj,legal_name,is_active")
     .in("id",[companyId,targetCompanyId]));
   if(firms.length!==2||firms.some((c:any)=>!c.is_active))error("Empresas inexistentes ou inativas.",409);
   const origin=firms.find((c:any)=>c.id===companyId)!;
   const target=firms.find((c:any)=>c.id===targetCompanyId)!;
   const originUser=await gavClientUser("cliente-"+origin.cnpj+"@acesso.gavsolucoescontabeis.com.br");
   if(!originUser||originUser.app_metadata?.gav_test_account||
      originUser.app_metadata?.gav_account_kind!=="client"||
      originUser.app_metadata?.gav_company_id!==companyId)
      error("Ative antes o login definitivo do CNPJ de origem.",409);
   const originPrimary=check(await supa.from("gav_memberships")
     .select("active,password_change_required").eq("user_id",originUser.id)
     .eq("company_id",companyId).maybeSingle());
   if(!originPrimary?.active||originPrimary.password_change_required||
      originUser.app_metadata?.gav_password_change_required===true)
      error("O CNPJ de origem precisa estar ativo e com senha definitiva.",409);
   const reciprocal=b.reciprocal===true;
   let targetUser:any=null;
   if(reciprocal){
     targetUser=await gavClientUser("cliente-"+target.cnpj+"@acesso.gavsolucoescontabeis.com.br");
     if(!targetUser||targetUser.app_metadata?.gav_test_account||
        targetUser.app_metadata?.gav_account_kind!=="client"||
        targetUser.app_metadata?.gav_company_id!==targetCompanyId)
       error("Ative o login definitivo do segundo CNPJ para liberar as duas entradas.",409);
     const secondaryPrimary=check(await supa.from("gav_memberships")
       .select("active,password_change_required").eq("user_id",targetUser.id)
       .eq("company_id",targetCompanyId).maybeSingle());
     if(!secondaryPrimary?.active||secondaryPrimary.password_change_required||
         targetUser.app_metadata?.gav_password_change_required===true)
       error("O login do segundo CNPJ precisa ter senha definitiva.",409);
   }
   if(action==="linkClientCompany"){
     const folders=check(await supa.from("gav_drive_folders").select("company_id")
       .in("company_id",[companyId,targetCompanyId]).eq("is_active",true));
     if(![companyId,targetCompanyId].every((id:string)=>folders.some((f:any)=>f.company_id===id)))
       error("As duas empresas devem ter pasta do Drive autorizada.",409);
     check(await supa.from("gav_memberships").upsert(
       {user_id:originUser.id,company_id:targetCompanyId,active:true,password_change_required:false},
       {onConflict:"user_id,company_id"}));
     if(reciprocal)check(await supa.from("gav_memberships").upsert(
       {user_id:targetUser.id,company_id:companyId,active:true,password_change_required:false},
       {onConflict:"user_id,company_id"}));
     check(await supa.from("gav_audit_events").insert([
       {actor_user_id:user.id,company_id:targetCompanyId,action:"CLIENT_COMPANY_LINKED"},
       ...(reciprocal?[{actor_user_id:user.id,company_id:companyId,action:"CLIENT_COMPANY_LINKED_RECIPROCAL"}]:[])
     ]));
     return reply({ok:true,linked:true,reciprocal});
   }
   check(await supa.from("gav_memberships").update({active:false})
     .eq("user_id",originUser.id).eq("company_id",targetCompanyId));
   if(reciprocal)check(await supa.from("gav_memberships").update({active:false})
     .eq("user_id",targetUser.id).eq("company_id",companyId));
   check(await supa.from("gav_audit_events").insert([
     {actor_user_id:user.id,company_id:targetCompanyId,action:"CLIENT_COMPANY_UNLINKED"},
     ...(reciprocal?[{actor_user_id:user.id,company_id:companyId,action:"CLIENT_COMPANY_UNLINKED_RECIPROCAL"}]:[])
   ]));
   return reply({ok:true,linked:false,reciprocal});
  }
  if(["clientAccessStatus","issueClientAccess","disableClientAccess"].includes(action)){
   adminOnly();
   const company=check(await supa.from("gav_companies").select("id,cnpj,legal_name,is_active").eq("id",companyId).maybeSingle());
   if(!company?.is_active)error("Empresa não cadastrada ou inativa.",404);
   const email="cliente-"+company.cnpj+"@acesso.gavsolucoescontabeis.com.br";
   const existing=await gavClientUser(email);
   if(existing?.app_metadata?.gav_test_account)error("Existe login de teste. Desative-o antes de criar o acesso definitivo.",409);
   if(existing&&(existing.app_metadata?.gav_account_kind!=="client"||existing.app_metadata?.gav_company_id!==companyId))
     error("Existe uma conta não reconhecida para este CNPJ. Conferência necessária.",409);
   const membership=existing?check(await supa.from("gav_memberships").select("company_id,active,password_change_required").eq("user_id",existing.id)):[];
   const active=membership.some((m:any)=>m.company_id===companyId&&m.active);
   if(action==="clientAccessStatus"){
     const otherIds=membership.filter((m:any)=>m.company_id!==companyId&&m.active).map((m:any)=>m.company_id);
     const linkedCompanies=otherIds.length?check(await supa.from("gav_companies")
       .select("id,cnpj,code,legal_name,office_id,is_active").in("id",otherIds)):[];
     return reply({exists:!!existing,active,
       needsPasswordChange:existing?.app_metadata?.gav_password_change_required===true||membership.some((m:any)=>m.password_change_required),
       cnpj:company.cnpj,linkedCompanies});
   }
   if(action==="disableClientAccess"){
    if(existing)check(await supa.from("gav_memberships").update({active:false}).eq("user_id",existing.id));
    return reply({ok:true,active:false});
   }
   const folder=check(await supa.from("gav_drive_folders").select("id").eq("company_id",companyId).eq("is_active",true).maybeSingle());
   if(!folder)error("Empresa sem pasta conferida no Drive.",409);
   if(existing&&b.confirmReset!==true)error("Confirme a substituição da senha anterior para renovar o acesso.",409);
   const password=gavNewPassword(), metadata={...(existing?.app_metadata||{}),gav_account_kind:"client",gav_company_id:companyId,gav_password_change_required:true,gav_password_issued_at:new Date().toISOString()};
   let uid:string;
   if(existing){
    check(await supa.from("gav_memberships").update({password_change_required:true}).eq("user_id",existing.id));
    const updated=await supa.auth.admin.updateUserById(existing.id,{password,app_metadata:metadata});
    if(updated.error)error("Não foi possível renovar a senha.",502);
    uid=existing.id;
   }else{
    const created=await supa.auth.admin.createUser({email,password,email_confirm:true,app_metadata:metadata});
    if(created.error||!created.data.user)error("Não foi possível criar o usuário do cliente.",502);
    uid=created.data.user.id;
   }
   check(await supa.from("gav_memberships").upsert({user_id:uid,company_id:companyId,active:true,password_change_required:true},{onConflict:"user_id,company_id"}));
   check(await supa.from("gav_audit_events").insert({actor_user_id:user.id,company_id:companyId,action:existing?"CLIENT_ACCESS_REISSUED":"CLIENT_ACCESS_CREATED"}));
   return reply({ok:true,cnpj:company.cnpj,password,needsPasswordChange:true,initial:!existing});
  }
  if(action==="me"){
   const companies=isAdmin?check(await supa.from("gav_companies").select("id,code,cnpj,legal_name,folder_label,office_id,is_active").order("code")):companyIds.length?check(await supa.from("gav_companies").select("id,code,cnpj,legal_name,folder_label,office_id,is_active").in("id",companyIds)):[];
   const offices=isAdmin?check(await supa.from("gav_offices").select("id,code,display_name").order("code")):[];
   const linked=isAdmin?check(await supa.from("gav_drive_folders").select("company_id,is_active,auto_publish_new,last_synced_at,last_indexed_count").eq("is_active",true)):[];
   const candidate=isAdmin?check(await supa.from("gav_drive_candidates").select("company_id,label,verified_at")):[];
   const sync=isAdmin?check(await supa.from("gav_sync_runs")
    .select("company_id,state,indexed_count,started_at,finished_at,error_safe")
    .order("started_at",{ascending:false}).limit(250)):[];
   return reply({role:isAdmin?"admin":"client",primaryCompanyId:!isAdmin?String(user.app_metadata?.gav_company_id||""):"",passwordChangeRequired:changeRequired,clientManaged:!isAdmin&&user.app_metadata?.gav_account_kind==="client",offices,companies,linked,candidate,sync,driveSecretsConfigured:!!(Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")&&Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET"))});
  }
  if(action==="documents"){
   companyOnly();
   if(changeRequired)error("Defina a senha definitiva antes de consultar os documentos.",403);
   const page=Number(b.page||0);
   if(!Number.isInteger(page)||page<0||page>40)error("Página inválida.",400);
   let q=supa.from("gav_documents").select("id,company_id,file_name,mime_type,relative_path,category,year,month,review_status,published_at")
    .eq("company_id",companyId).neq("review_status","REMOVIDO").order("file_name").order("id");
   if(!isAdmin)q=q.eq("review_status","APROVADO").not("published_at","is",null);
   const rows=check(await q.range(page*500,page*500+499));
   return reply({documents:rows,hasMore:rows.length===500,page});
  }
  if(action==="clientPreview"){
   adminOnly();
   const company=check(await supa.from("gav_companies").select("id,is_active").eq("id",companyId).eq("is_active",true).maybeSingle());
   if(!company)error("Empresa não encontrada ou inativa.",404);
   const page=Number(b.page||0);
   if(!Number.isInteger(page)||page<0||page>40)error("Página inválida.",400);
   const documents=check(await supa.from("gav_documents")
     .select("id,company_id,file_name,mime_type,relative_path,category,year,month,review_status,published_at")
     .eq("company_id",companyId).eq("review_status","APROVADO")
     .not("published_at","is",null).order("file_name").order("id").range(page*500,page*500+499));
   return reply({documents,preview:true,hasMore:documents.length===500,page});
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
  if(action==="activateCompanyAutoSync"||action==="pauseCompanyAutoSync"){
   adminOnly();
   const folder=check(await supa.from("gav_drive_folders").select("id,auto_publish_new,last_synced_at")
    .eq("company_id",companyId).eq("is_active",true).maybeSingle());
   if(!folder)error("Vincule a pasta da empresa antes de ativar.",409);
   if(action==="activateCompanyAutoSync"){
    if(!folder.last_synced_at)error("A primeira importação precisa ser concluída antes de ativar documentos novos.",409);
   }
   check(await supa.from("gav_drive_folders")
    .update({auto_publish_new:action==="activateCompanyAutoSync"})
    .eq("id",folder.id).eq("company_id",companyId));
   return reply({ok:true,autoPublishNew:action==="activateCompanyAutoSync"});
  }
  if(action==="createCompanyTestAccess"||action==="removeCompanyTestAccess"){
   adminOnly();
   const company=check(await supa.from("gav_companies").select("id,cnpj,is_active")
    .eq("id",companyId).eq("is_active",true).maybeSingle());
   if(!company)error("Empresa não cadastrada ou inativa.",404);
   const folder=check(await supa.from("gav_drive_folders").select("id")
    .eq("company_id",companyId).eq("is_active",true).maybeSingle());
   if(!folder)error("Empresa sem pasta verificada.",409);
   const email="cliente-"+company.cnpj+"@acesso.gavsolucoescontabeis.com.br";
   const listed=await supa.auth.admin.listUsers({page:1,perPage:1000});
   if(listed.error)error("Não foi possível verificar os usuários.",502);
   const existing=listed.data.users.find((u:any)=>u.email?.toLowerCase()===email);
   if(existing&&!existing.app_metadata?.gav_test_account)error("Já existe acesso real para o cliente. Não alteramos sua conta.",409);
   if(action==="removeCompanyTestAccess"){
    if(existing){
     const deleted=await supa.auth.admin.deleteUser(existing.id);
     if(deleted.error)error("Não foi possível remover o acesso temporário.",502);
    }
    return reply({removed:true});
   }
   if(existing){
    const other=check(await supa.from("gav_memberships").select("company_id")
     .eq("user_id",existing.id).neq("company_id",companyId));
    if(other.length)error("Conta já vinculada a outra empresa. Operação recusada.",403);
   }
   const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
   const random=new Uint8Array(32);crypto.getRandomValues(random);
   const password=Array.from(random,(n:number)=>chars[n%chars.length]).join("");
   let uid:string;
   if(existing){
    const changed=await supa.auth.admin.updateUserById(existing.id,{password});
    if(changed.error)error("Falha ao renovar senha temporária.",502);
    uid=existing.id;
   }else{
    const created=await supa.auth.admin.createUser({email,password,email_confirm:true,
     app_metadata:{gav_test_account:true}});
    if(created.error||!created.data.user)error("Falha ao criar conta de teste.",502);
    uid=created.data.user.id;
   }
   check(await supa.from("gav_memberships").upsert({
    user_id:uid,company_id,active:true
   },{onConflict:"user_id,company_id"}));
   return reply({test:true,cnpj:company.cnpj,password});
  }
  if(action==="connectDrive"){
   adminOnly();
   if(typeof b.refreshToken!=="string"||b.refreshToken.length<20)error("Google não forneceu autorização offline. Reconecte com consentimento.",409);
   const clientId=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),clientSecret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
   if(!clientId||!clientSecret)error("Credenciais Google Drive indisponíveis no servidor.",409);
   const oauth=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:"refresh_token",refresh_token:b.refreshToken})
   });
   if(!oauth.ok)error("O Google recusou a nova autorização. Clique em Autorizar / renovar Google Drive e permita o acesso.",409);
   const current=await oauth.json();
   if(!current.access_token)error("O Google não forneceu credenciais válidas para o Drive.",409);
   const probe=await fetch("https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)",{
    headers:{Authorization:"Bearer "+current.access_token}
   });
   if(!probe.ok)error("A autorização não permite consultar os arquivos do Drive. Ao renovar, autorize a leitura do Google Drive.",409);
   check(await supa.rpc("gav_store_drive_refresh",{p_refresh:b.refreshToken}));
   return reply({connected:true,verified:true});
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
  if(action==="releaseCompanyHistory"){
   adminOnly();
   const firm=check(await supa.from("gav_companies").select("id,legal_name,is_active")
    .eq("id",companyId).eq("is_active",true).maybeSingle());
   if(!firm)error("Empresa não cadastrada.",404);
   if(String(b.confirmName||"")!==firm.legal_name)error("Confirme a empresa exata antes de liberar o histórico.",400);
   const links=check(await supa.from("gav_drive_folders").select("id,last_synced_at")
    .eq("company_id",companyId).eq("is_active",true));
   if(!links.length||!links.some((x:any)=>x.last_synced_at))error("Importação inicial não concluída.",409);
   const folderIds=links.filter((x:any)=>x.last_synced_at).map((x:any)=>x.id);
   const countResult=await supa.from("gav_documents").select("id",{count:"exact",head:true})
    .eq("company_id",companyId).in("drive_folder_link_id",folderIds).eq("review_status","PENDENTE");
   if(countResult.error)error("Não foi possível contar documentos pendentes.",502);
   const pending=countResult.count||0;
   if(!pending)return reply({ok:true,released:0});
   check(await supa.from("gav_documents").update({
    review_status:"APROVADO",published_at:new Date().toISOString()
   }).eq("company_id",companyId).in("drive_folder_link_id",folderIds).eq("review_status","PENDENTE"));
   return reply({ok:true,released:pending});
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