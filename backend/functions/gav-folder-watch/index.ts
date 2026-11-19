import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";

const db=createClient(Deno.env.get("SUPABASE_URL")!,
 (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
 {auth:{persistSession:false,autoRefreshToken:false}});
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info,x-gav-internal-token",
 "Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const roots:Record<string,string>={
 "TTM":"1nlhFibjDGSRBlBVVH-2oy9EmN1hO2viM",
 "DS CONTÁBIL":"1IqxunIzcO0BmwQex6cnITI_jQbppHV5J",
 "REL GAV":"1mIMb7ZF7vBZi_EEwBl_SASVU1gAtzUJ9"
};
function respond(value:any,status=200){return new Response(JSON.stringify(value),
 {status,headers:{...cors,"Content-Type":"application/json;charset=utf-8"}})}
function fail(message:string,status=400):never{throw {message,status}}
function data(r:any){if(r.error){console.error("folder-watch-db",r.error.code);fail("Falha ao atualizar o catálogo de pastas.",502)}return r.data}
async function access(){
 const client=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!client||!secret)fail("Credenciais Google indisponíveis.",409);
 const token=data(await db.rpc("gav_read_drive_refresh"));
 if(!token)fail("Autorização do Drive indisponível.",409);
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({client_id:client,client_secret:secret,grant_type:"refresh_token",refresh_token:String(token)})});
 if(!r.ok)fail("A conexão Google Drive precisa ser renovada.",409);
 const result=await r.json();if(!result.access_token)fail("Autorização Google inválida.",502);
 return String(result.access_token);
}
async function folders(root:string,token:string){
 let page="",out:{id:string,name:string}[]=[];
 do{
  const u=new URL("https://www.googleapis.com/drive/v3/files");
  u.searchParams.set("q","'"+root+"' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'");
  u.searchParams.set("fields","nextPageToken,files(id,name,mimeType,parents,trashed)");
  u.searchParams.set("pageSize","1000");
  u.searchParams.set("supportsAllDrives","true");
  u.searchParams.set("includeItemsFromAllDrives","true");
  if(page)u.searchParams.set("pageToken",page);
  const response=await fetch(u,{headers:{Authorization:"Bearer "+token}});
  if(!response.ok)fail("O Google Drive recusou a descoberta de pastas ("+response.status+").",502);
  const result=await response.json();
  for(const item of result.files||[]){
   if(item.mimeType==="application/vnd.google-apps.folder"&&!item.trashed&&item.parents?.includes(root)&&
     item.id&&item.name&&item.name.length<=500)out.push({id:item.id,name:item.name});
  }
  if(out.length>3000)fail("Há mais de 3000 pastas para conferir.",409);
  page=result.nextPageToken||"";
 }while(page);
 return out;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||(req.headers.get("origin")&&req.headers.get("origin")!==origin))
   fail("Origem não autorizada.",403);
  const internal=req.headers.get("x-gav-internal-token")||"";
  if(internal.length<40||internal.length>150)fail("Agendamento não autorizado.",403);
  if(data(await db.rpc("gav_validate_drive_scheduler",{p_token:internal}))!==true)
   fail("Agendamento não autorizado.",403);
  const request=await req.json();
  if(request.action!=="scan")fail("Ação inválida.",400);
  const officeRows=data(await db.from("gav_offices").select("id,code").in("code",Object.keys(roots)));
  let token:string;
  try{token=await access()}
  catch(e:any){
   const errorMessage=String(e?.message||"Google Drive indisponível").slice(0,180);
   const at=new Date().toISOString();
   for(const office of officeRows){
    const previous=data(await db.from("gav_drive_discovery_status").select("last_success_at")
     .eq("office_id",office.id).maybeSingle());
    data(await db.from("gav_drive_discovery_status").upsert({
     office_id:office.id,last_success_at:previous?.last_success_at||null,
     last_attempt_at:at,last_error:errorMessage,updated_at:at
    },{onConflict:"office_id"}));
   }
   return respond({ok:false,error:errorMessage},e?.status||502);
  }
  const results:any[]=[];
  for(const office of officeRows){
   const start=new Date().toISOString();
   try{
    const list=await folders(roots[office.code],token);
    for(let i=0;i<list.length;i+=150){
     const batch=list.slice(i,i+150).map(f=>({
      office_id:office.id,drive_folder_id:f.id,folder_name:f.name,is_present:true,last_seen_at:start
     }));
     data(await db.from("gav_drive_discovered_folders").upsert(batch,{onConflict:"office_id,drive_folder_id"}));
    }
    data(await db.from("gav_drive_discovered_folders").update({is_present:false})
     .eq("office_id",office.id).lt("last_seen_at",start).eq("is_present",true));
    data(await db.from("gav_drive_discovery_status").upsert({
      office_id:office.id,last_success_at:new Date().toISOString(),last_attempt_at:start,
      last_error:null,updated_at:new Date().toISOString()
    },{onConflict:"office_id"}));
    results.push({office:office.code,folders:list.length,ok:true});
   }catch(e:any){
    // Não apagar o inventário anterior nem os vínculos de empresas ao falhar.
    const errorMessage=String(e?.message||"Erro ao conferir pastas.").slice(0,180);
    const previous=data(await db.from("gav_drive_discovery_status").select("last_success_at")
      .eq("office_id",office.id).maybeSingle());
    data(await db.from("gav_drive_discovery_status").upsert({
      office_id:office.id,last_success_at:previous?.last_success_at||null,
      last_attempt_at:start,last_error:errorMessage,updated_at:new Date().toISOString()
    },{onConflict:"office_id"}));
    results.push({office:office.code,ok:false,error:errorMessage});
   }
  }
  return respond({ok:results.every(r=>r.ok),results});
 }catch(e:any){return respond({error:String(e?.message||"Falha ao verificar pastas.")},e?.status||500)}
});
