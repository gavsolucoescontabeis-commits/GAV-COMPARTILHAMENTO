import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";
const url=Deno.env.get("SUPABASE_URL")!;
const key=(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const fail=(msg:string,status=400):never=>{throw {message:msg,status}};
function data(v:any){if(v.error){console.error("Banco",v.error.code);fail("Falha na consulta do cadastro.",502)}return v.data}
async function token(){
 const cid=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!cid||!secret)fail("Credenciais Google ausentes.",409);
 const refresh=data(await db.rpc("gav_read_drive_refresh"));
 if(!refresh)fail("Drive desconectado.",409);
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
 body:new URLSearchParams({client_id:cid,client_secret:secret,refresh_token:refresh,grant_type:"refresh_token"})});
 if(!r.ok)fail("Renove a autorização Google Drive.",409);
 return (await r.json()).access_token as string;
}
async function listFolders(parent:string,access:string){
 let page="",files:any[]=[];
 do{
  const u=new URL("https://www.googleapis.com/drive/v3/files");
  u.searchParams.set("q","'"+parent+"' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'");
  u.searchParams.set("fields","nextPageToken,files(id,name,mimeType,parents,trashed)");
  u.searchParams.set("pageSize","1000");
  if(page)u.searchParams.set("pageToken",page);
  const r=await fetch(u,{headers:{Authorization:"Bearer "+access}});
  if(!r.ok)fail("A listagem das pastas TTM falhou ("+r.status+").",502);
  const j=await r.json();files.push(...(j.files||[]));page=j.nextPageToken||"";
  if(files.length>3000)fail("Excesso de pastas na raiz. Conferência manual necessária.",409);
 }while(page);
 return files.filter(f=>f.parents?.includes(parent)&&!f.trashed);
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||(req.headers.get("origin")&&req.headers.get("origin")!==origin))fail("Origem não permitida.",403);
  const provided=req.headers.get("x-gav-internal-token");
  let actor="";
  if(provided!==null){
   if(provided.length<40||provided.length>150||data(await db.rpc("gav_validate_drive_scheduler",{p_token:provided}))!==true)
    fail("Autorização de serviço inválida.",403);
  }else{
   const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
   const {data:{user},error}=await db.auth.getUser(jwt);
   if(error||!user||user.email?.toLowerCase()!=="gavsolucoescontabeis@gmail.com"||!user.email_confirmed_at||
     !user.app_metadata?.providers?.includes("google"))fail("Somente administrador GAV.",403);
   if(!data(await db.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle()))
    fail("Administrador não autorizado.",403);
   actor=user.id;
  }
  const body=await req.json(),action=String(body.action||"preview");
  if(action!=="preview"&&action!=="linkVerified")fail("Ação inválida.",400);
  // A primeira pasta previamente validada fornece a raiz aprovada; sem IDs de clientes no fonte público.
  const base=data(await db.from("gav_drive_candidates")
   .select("company_id,expected_parent_id,verified_at").not("verified_at","is",null)
   .order("verified_at",{ascending:true}).limit(1).single());
  const pilot=data(await db.from("gav_companies").select("id,office_id").eq("id",base.company_id).single());
  const pilotLink=data(await db.from("gav_drive_folders").select("approved_by,drive_folder_id")
    .eq("company_id",pilot.id).eq("is_active",true).limit(1).single());
  if(!pilotLink||!base?.expected_parent_id)fail("Não há raiz TTM conferida.",409);
  if(!actor)actor=pilotLink.approved_by;
  const companies=data(await db.from("gav_companies").select("id,code,folder_label,legal_name")
   .eq("office_id",pilot.office_id).eq("is_active",true).order("code"));
  const existing=data(await db.from("gav_drive_folders").select("company_id,drive_folder_id,is_active").eq("is_active",true));
  const access=await token(),folders=await listFolders(base.expected_parent_id,access);
  const byLabel=new Map<string,any[]>();
  for(const f of folders){if(!byLabel.has(f.name))byLabel.set(f.name,[]);byLabel.get(f.name)!.push(f)}
  let linked=0,already=0;
  const summary=[];
  for(const c of companies){
   const exact=byLabel.get(c.folder_label)||[];
   const current=existing.filter((x:any)=>x.company_id===c.id);
   let status="SEM_CORRESPONDENCIA_EXATA";
   if(exact.length>1)status="DUPLICADO";
   else if(exact.length===1&&current.length&&current.some((x:any)=>x.drive_folder_id!==exact[0].id))status="CONFLITO_VINCULO";
   else if(exact.length===1){
    status=current.length?"JA_VINCULADA":"CORRESPONDENCIA_EXATA";
    if(action==="linkVerified"){
     if(!current.length){
      data(await db.from("gav_drive_candidates").upsert({
       company_id:c.id,label:c.folder_label,folder_id:exact[0].id,expected_parent_id:base.expected_parent_id,
       verified_at:new Date().toISOString()
      },{onConflict:"company_id"}));
      data(await db.from("gav_drive_folders").insert({
       company_id:c.id,drive_folder_id:exact[0].id,drive_parent_id:base.expected_parent_id,
       approved_by:actor,is_active:true,auto_publish_new:false
      }));
      linked++;
      status="VINCULADA_SEM_PUBLICAR";
     }else already++;
    }
   }
   summary.push({code:c.code,name:c.legal_name,label:c.folder_label,status});
  }
  return new Response(JSON.stringify({totalCompanies:companies.length,driveFoldersFound:folders.length,linked,already,summary}),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e:any){return new Response(JSON.stringify({error:String(e.message||"Falha de conferência")}),
  {status:e.status||500,headers:{...cors,"Content-Type":"application/json"}})}
});