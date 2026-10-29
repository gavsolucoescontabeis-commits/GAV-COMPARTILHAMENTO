import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";
const s=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const err=(message:string,status=400):never=>{throw {message,status}};
const get=(r:any)=>{if(r.error)err("Falha no servidor de documentos.",502);return r.data};
async function driveAccess(body:any,admin:boolean){
 if(admin&&typeof body.googleToken==="string"&&body.googleToken.length>30)return body.googleToken;
 const id=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!id||!secret)err("Credenciais Google do backend ainda não configuradas.",409);
 const ref=get(await s.rpc("gav_read_drive_refresh"));if(!ref)err("Google Drive ainda não conectado.",409);
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",client_id:id,client_secret:secret,refresh_token:ref})});
 if(!r.ok)err("A autorização do Google precisa ser renovada.",409);
 return (await r.json()).access_token;
}
async function info(id:string,t:string){
 const u=new URL("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id));u.searchParams.set("fields","id,parents,trashed,mimeType,size");
 const r=await fetch(u,{headers:{Authorization:"Bearer "+t}});
 if(!r.ok)err("Não foi possível verificar a localização do PDF no Drive.",502);return r.json();
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||req.headers.get("Origin")&&req.headers.get("Origin")!==origin)err("Acesso inválido.",403);
  const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  const {data:{user},error}=await s.auth.getUser(jwt);if(error||!user)err("Faça login.",401);
  const b=await req.json(),company=String(b.companyId||""),document=String(b.documentId||"");
  const admin=user.email?.toLowerCase()==="gavsolucoescontabeis@gmail.com"&&!!user.email_confirmed_at&&user.app_metadata?.providers?.includes("google")&&!!get(await s.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle());
  if(!admin){
   const m=get(await s.from("gav_memberships").select("user_id").eq("user_id",user.id).eq("company_id",company).eq("active",true).maybeSingle());
   if(!m)err("Você não tem acesso aos documentos desta empresa.",403);
  }
  const doc=get(await s.from("gav_documents").select("id,drive_file_id,drive_folder_link_id,mime_type,file_name,published_at,review_status").eq("id",document).eq("company_id",company).maybeSingle());
  if(!doc)err("PDF não encontrado.",404);
  if(!admin&&(doc.review_status!=="APROVADO"||!doc.published_at))err("PDF não liberado ao cliente.",403);
  if(doc.mime_type!=="application/pdf")err("Somente PDFs.",415);
  const folder=get(await s.from("gav_drive_folders").select("drive_folder_id").eq("id",doc.drive_folder_link_id).eq("company_id",company).eq("is_active",true).maybeSingle());
  if(!folder)err("Vínculo de pasta inativo.",403);
  const access=await driveAccess(b,admin);
  let node=await info(doc.drive_file_id,access);
  if(node.trashed||node.mimeType!=="application/pdf"||Number(node.size||0)>25000000)err("PDF excluído ou acima de 25 MB.",409);
  let parents=node.parents||[],seen=new Set<string>(),valid=false;
  for(let depth=0;depth<24&&parents.length;depth++){
   if(parents.includes(folder.drive_folder_id)){valid=true;break}
   const next=parents.find((id:string)=>!seen.has(id));if(!next)break;seen.add(next);
   node=await info(next,access);if(node.trashed)break;parents=node.parents||[];
  }
  if(!valid)err("Este PDF foi movido para fora da pasta autorizada.",403);
  const r=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(doc.drive_file_id)+"?alt=media",{headers:{Authorization:"Bearer "+access}});
  if(!r.ok||!r.body)err("Não foi possível transferir o PDF original.",502);
  await s.from("gav_audit_events").insert({actor_user_id:user.id,company_id:company,document_id:doc.id,action:"PDF_ABERTO"});
  const name=doc.file_name.replace(/[\r\n]/g,"_");
  return new Response(r.body,{headers:{...cors,"Content-Type":"application/pdf","X-Content-Type-Options":"nosniff","Content-Disposition":"inline; filename*=UTF-8''"+encodeURIComponent(name)}});
 }catch(e:any){return new Response(JSON.stringify({error:String(e.message||"Erro")}),{status:e.status||500,headers:{...cors,"Content-Type":"application/json"}})}
});