import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";
const db=createClient(Deno.env.get("SUPABASE_URL")!,
 (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
 {auth:{persistSession:false,autoRefreshToken:false}});
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,"Content-Type":"application/json"}});
function fail(message:string,status=400):never{throw {message,status}}
function check<T=any>(r:{data:T,error:any}):T{if(r.error){console.error("company-admin-db",r.error.code);if(r.error.code==="23505")fail("CNPJ, código ou pasta já cadastrados. Confira os dados.",409);fail("Não foi possível salvar o cadastro.",502)}return r.data}
const digits=(value:unknown)=>String(value??"").replace(/\D/g,"");
function validCnpj(n:string){
 if(n.length!==14||/^(\d)\1+$/.test(n))return false;
 for(const d of [12,13]){
  const weights=d===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];
  const checkDigit=11-(weights.reduce((sum,w,i)=>sum+w*Number(n[i]),0)%11);
  if(Number(n[d])!==(checkDigit>=10?0:checkDigit))return false;
 }
 return true;
}
const roots:Record<string,string>={
 "TTM":"1nlhFibjDGSRBlBVVH-2oy9EmN1hO2viM",
 "DS CONTÁBIL":"1IqxunIzcO0BmwQex6cnITI_jQbppHV5J",
 "REL GAV":"1mIMb7ZF7vBZi_EEwBl_SASVU1gAtzUJ9"
};
async function driveAccess(){
 const id=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!id||!secret)fail("Credenciais do Google Drive não configuradas.",409);
 const refresh=check(await db.rpc("gav_read_drive_refresh"));
 if(!refresh)fail("Reconecte o Google Drive pela administração.",409);
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",
 headers:{"Content-Type":"application/x-www-form-urlencoded"},
 body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:String(refresh),grant_type:"refresh_token"})});
 if(!r.ok)fail("Autorização do Google Drive expirada. Reconecte pelo painel.",409);
 const data=await r.json();
 if(!data.access_token)fail("Google Drive não retornou acesso válido.",502);
 return String(data.access_token);
}
async function getDrive(path:string,token:string,query:Record<string,string>={}){
 const u=new URL("https://www.googleapis.com/drive/v3/"+path);
 for(const [key,val] of Object.entries(query))u.searchParams.set(key,val);
 const r=await fetch(u,{headers:{Authorization:"Bearer "+token}});
 if(!r.ok)fail("Falha ao verificar o Google Drive ("+r.status+").",502);
 return await r.json();
}
async function listFolder(root:string,token:string){
 let next="",all:any[]=[];
 do{
  const q:Record<string,string>={q:"'"+root+"' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields:"nextPageToken,files(id,name,mimeType,parents,trashed)",pageSize:"1000",supportsAllDrives:"true",includeItemsFromAllDrives:"true"};
  if(next)q.pageToken=next;
  const r=await getDrive("files",token,q);
  all.push(...(r.files||[]));
  if(all.length>3000)fail("Excesso de pastas para listar.",409);
  next=r.nextPageToken||"";
 }while(next);
 return all.filter(f=>f.mimeType==="application/vnd.google-apps.folder"&&!f.trashed&&f.parents?.includes(root));
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||(req.headers.get("origin")&&req.headers.get("origin")!==origin))fail("Origem não autorizada.",403);
  const token=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  if(!token)fail("Sessão administrativa necessária.",401);
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user||!user.email_confirmed_at||
    user.email?.toLowerCase()!=="gavsolucoescontabeis@gmail.com"||
    !user.app_metadata?.providers?.includes("google"))fail("Somente administração GAV.",403);
  if(!check(await db.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle()))
   fail("Administrador não autorizado.",403);
  const b=await req.json();
  const action=String(b.action||"");
  if(!["folders","save","deactivate","reactivate"].includes(action))fail("Ação não autorizada.",400);
  const officeId=String(b.officeId||"");
  const office=check(await db.from("gav_offices").select("id,code").eq("id",officeId).maybeSingle());
  if(!office)fail("Escritório não encontrado.",404);
  const root=roots[office.code]||"";
  if(action==="folders"){
   if(!root)return json({officeId,folders:[],rootAvailable:false,
     notice:"Este escritório ainda não tem diretório principal do Drive configurado. É possível cadastrar a empresa sem vincular pasta."});
   const access=await driveAccess();
   const found=await listFolder(root,access);
   // Pastas de empresas desativadas não podem reaparecer como "sem cadastro".
   const links=check(await db.from("gav_drive_folders")
     .select("company_id,drive_folder_id,is_active"));
   const retiredCompanies=check(await db.from("gav_companies")
     .select("id").eq("office_id",officeId).eq("is_active",false));
   const retiredIds=new Set(retiredCompanies.map((c:any)=>c.id));
   const folderRows=found.map((f:any)=>{
    const active=links.find((x:any)=>x.drive_folder_id===f.id&&x.is_active);
    const retired=links.find((x:any)=>x.drive_folder_id===f.id&&!x.is_active&&retiredIds.has(x.company_id));
    return {id:f.id,name:f.name,linkedCompanyId:active?.company_id||null,retired:!!retired};
   }).sort((a:any,b:any)=>a.name.localeCompare(b.name,"pt-BR",{numeric:true}));
   return json({officeId,folders:folderRows,rootAvailable:true});
  }
  const id=String(b.companyId||"");
  if(id&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))fail("Identificador inválido.",400);
  if(action==="deactivate"||action==="reactivate"){
   if(!id)fail("Informe a empresa.",400);
   const company=check(await db.from("gav_companies")
     .select("id,legal_name,is_active,office_id").eq("id",id).eq("office_id",officeId).maybeSingle());
   if(!company)fail("Empresa não encontrada neste escritório.",404);
   const activate=action==="reactivate";
   if(activate&&!company.is_active){
    // Ao reativar, confirmar que a pasta antiga (mesmo se renomeada) ainda
    // pertence à raiz do escritório. Nunca apontar para outra empresa.
    const oldLinks=check(await db.from("gav_drive_folders")
      .select("drive_folder_id").eq("company_id",id));
    if(oldLinks.length>1)fail("Há múltiplas pastas antigas. Faça a conferência.",409);
    if(oldLinks.length===1){
     const access=await driveAccess();
     const folder=await getDrive("files/"+encodeURIComponent(oldLinks[0].drive_folder_id),access,
       {fields:"id,name,mimeType,parents,trashed",supportsAllDrives:"true"});
     if(folder.trashed||folder.mimeType!=="application/vnd.google-apps.folder"||
        !folder.parents?.includes(root))
      fail("A pasta antiga não está no diretório original. Confira o Drive antes de reativar.",409);
    }
   }
   const outcome=check(await db.rpc("gav_admin_set_company_active",{
     p_company_id:id,p_office_id:officeId,p_actor_user_id:user.id,p_active:activate
   }));
   return json({...outcome,notice:activate?
     "Empresa reativada na carteira. Os acessos de clientes continuam suspensos até liberação expressa.":
     "Empresa retirada da carteira ativa e do Processamento. Documentos históricos preservados no GAV e no Google Drive."});
  }
  const cnpj=digits(b.cnpj),name=String(b.legalName||"").trim().replace(/\s+/g," ");
  const code=String(b.code??"").trim(),folderId=String(b.folderId||"").trim();
  if(!validCnpj(cnpj))fail("CNPJ inválido. Confira os dígitos verificadores.",400);
  if(name.length<2||name.length>180)fail("Informe a razão social/nome entre 2 e 180 caracteres.",400);
  if(code&&!/^\d{1,4}$/.test(code))fail("O código deve ter até quatro dígitos numéricos.",400);
  if(folderId&&!root)fail("Este escritório não possui raiz aprovada para vincular pastas.",409);
  let current:any=null;
  if(id){
   current=check(await db.from("gav_companies")
    .select("id,office_id,cnpj,legal_name,code,folder_label,is_active").eq("id",id).maybeSingle());
   if(!current||current.office_id!==officeId)fail("Empresa não pertence a este escritório.",403);
  }
  const duplicate=check(await db.from("gav_companies").select("id")
    .eq("cnpj",cnpj).maybeSingle());
  if(duplicate&&duplicate.id!==id)fail("Este CNPJ já está cadastrado. Use Editar empresa, não crie outro registro.",409);
  if(code){
   const others=check(await db.from("gav_companies").select("id")
    .eq("office_id",officeId).eq("code",code));
   if(others.some((c:any)=>c.id!==id))fail("Código já utilizado por outra empresa deste escritório.",409);
  }
  if(current&&current.cnpj!==cnpj){
   const members=check(await db.from("gav_memberships").select("user_id").eq("company_id",id).limit(1));
   if(members.length)fail("CNPJ com acesso de cliente vinculado. Para alterar, regularize primeiro o login existente.",409);
  }
  const existingLink=id?check(await db.from("gav_drive_folders")
   .select("id,drive_folder_id").eq("company_id",id).eq("is_active",true)):[];
  if(existingLink.length>1)fail("A empresa possui múltiplas pastas vinculadas. Confira antes de editar.",409);
  if(existingLink.length&&folderId&&existingLink[0].drive_folder_id!==folderId)
   fail("A empresa já possui pasta vinculada. Não trocamos o vínculo automaticamente para proteger os documentos existentes.",409);
  let folder:any=null;
  if(folderId){
   const access=await driveAccess();
   folder=await getDrive("files/"+encodeURIComponent(folderId),access,
     {fields:"id,name,mimeType,parents,trashed",supportsAllDrives:"true"});
   if(folder.trashed||folder.mimeType!=="application/vnd.google-apps.folder"||
     !folder.parents?.includes(root))fail("A pasta escolhida não está dentro do escritório selecionado.",409);
   const prefix=String(folder.name).match(/^\s*(\d{1,4})(?:\s|[_.-]|$)/)?.[1];
   if(prefix&&code&&prefix!==code)fail("O código informado é diferente do início do nome da pasta. Confira antes de salvar.",409);
   const used=check(await db.from("gav_drive_folders")
    .select("company_id").eq("drive_folder_id",folder.id).eq("is_active",true));
   if(used.some((l:any)=>l.company_id!==id))fail("Esta pasta já está vinculada a outra empresa.",409);
  }
  const folderLabel=folder?.name||current?.folder_label||null;
  const payload={office_id:officeId,cnpj,legal_name:name,code:code||null,folder_label:folderLabel};
  let companyId=id,created=false;
  if(current){
   check(await db.from("gav_companies").update(payload).eq("id",id).eq("office_id",officeId));
  }else{
   const record=check(await db.from("gav_companies").insert({...payload,is_active:true}).select("id").single());
   companyId=record.id;created=true;
  }
  let linked=false;
  if(folder&&!existingLink.length){
   check(await db.from("gav_drive_candidates").upsert({
    company_id:companyId,folder_id:folder.id,expected_parent_id:root,
    label:folder.name,verified_at:new Date().toISOString()
   },{onConflict:"company_id"}));
   check(await db.from("gav_drive_folders").insert({
    company_id:companyId,drive_folder_id:folder.id,drive_parent_id:root,
    approved_by:user.id,is_active:true,auto_publish_new:false
   }));
   linked=true;
  }else if(folder&&existingLink.length){
   check(await db.from("gav_drive_candidates").upsert({
    company_id:companyId,folder_id:folder.id,expected_parent_id:root,
    label:folder.name,verified_at:new Date().toISOString()
   },{onConflict:"company_id"}));
  }
  check(await db.from("gav_audit_events").insert({
   actor_user_id:user.id,company_id:companyId,
   action:created?"COMPANY_CREATED":linked?"COMPANY_FOLDER_LINKED":"COMPANY_UPDATED"
  }));
  return json({ok:true,companyId,created,linked,
   notice:folder? "Cadastro salvo e pasta validada. Os documentos históricos não serão publicados automaticamente.":
   "Cadastro salvo sem pasta. Vincule uma pasta antes de liberar acesso ao cliente."});
 }catch(e:any){return json({error:String(e?.message||"Falha ao cadastrar empresa.")},e?.status||500)}
});