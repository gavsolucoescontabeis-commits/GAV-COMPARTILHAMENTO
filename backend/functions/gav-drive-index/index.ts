import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";
const s=createClient(Deno.env.get("SUPABASE_URL")!,(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,{auth:{persistSession:false,autoRefreshToken:false}});
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
function fail(message:string,status=400):never{throw {message,status}}
function val(v:any){if(v.error){console.error("SQL",v.error.code);fail("Falha no banco.",502)}return v.data}
async function getDrive(path:string,t:string,q:any={}){
 const u=new URL("https://www.googleapis.com/drive/v3/"+path);for(const [k,v] of Object.entries(q))u.searchParams.set(k,String(v));
 const r=await fetch(u,{headers:{Authorization:"Bearer "+t}});
 if(!r.ok)fail("Erro na consulta ao Drive ("+r.status+").",502);return r.json();
}
async function access(b:any){
 if(b.googleToken)return String(b.googleToken);
 const client=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!client||!secret)fail("Configure as credenciais Google nos segredos de Edge Functions do Supabase.",409);
 const refresh=val(await s.rpc("gav_read_drive_refresh"));
 if(!refresh)fail("Autorize a conta Google no portal primeiro.",409);
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:client,client_secret:secret,refresh_token:refresh,grant_type:"refresh_token"})});
 if(!r.ok)fail("Reconecte a conta Google.",409);return (await r.json()).access_token;
}
async function children(id:string,t:string){
 let page="",out:any[]=[];
 do{
  const q:any={q:"'"+id+"' in parents and trashed = false",fields:"nextPageToken,files(id,name,mimeType,modifiedTime)",pageSize:1000};
  if(page)q.pageToken=page;
  const d=await getDrive("files",t,q);out.push(...(d.files||[]));page=d.nextPageToken||"";
  if(out.length>1500)fail("Pasta muito grande para o piloto.",409);
 }while(page);return out;
}
function cat(p:string){
 const items=p.split("/"),name=(items.pop()||"").toUpperCase(),path=items.join("/").toUpperCase();
 const segments=path.split("/");
 // A pasta explícita ADM/RES/FER tem prioridade absoluta sobre a pasta de competência.
 if(segments.some(x=>/^(ADM|ADMISSAO|ADMISSOES|ADMISSÕES)$/.test(x))||/ADMISS|CONTRATAC/.test(name))return "ADMISSOES";
 if(segments.some(x=>/^(RES|RESCISAO|RESCISOES|RESCISÕES)$/.test(x))||/RESCIS|DESLIGAMENT/.test(name))return "RESCISOES";
 if(segments.some(x=>/^(FER|FERIAS|FÉRIAS)$/.test(x))||/FÉRIAS|FERIAS/.test(name))return "FERIAS";
 // Tributos NÃO ligados a folha: PIS/COFINS, IRPJ/CSLL, parcelamentos etc.
 if(/COFINS|(^|[^A-Z])PIS([^A-Z]|$)|IRPJ|CSLL|PARCEL|PGDAS|SIMPLES|ICMS|ISSQN|DARF[_ -]*MAED|(^|[^A-Z])IPI([^A-Z]|$)/.test(name))return "GUIAS_IMPOSTOS";
 if(segments.some(x=>/^(DANFE|NFE|NOTAS? FISCAIS?)$/.test(x)))return "OUTROS";
 // O acervo mensal da folha é uma categoria única; inclui DCTFWeb, INSS, FGTS,
 // eSocial, recibos, relatórios e PDFs soltos naquele mês.
 const monthly=segments.some(x=>/^(0[1-9]|1[0-3])20\d{2}$/.test(x))||
  /^X20\d{2}\/(0[1-9]|1[0-3])\d{2}(\/|$)/.test(path);
 if(monthly)return "FOLHA";
 if(/FOLHA|HOLERITE|CONTRACHEQUE|FGTS|INSS|DCTF.?WEB|E.?SOCIAL/.test(name))return "FOLHA";
 if(/DARF|GUIA|IMPOSTO|TRIBUTO/.test(name))return "GUIAS_IMPOSTOS";
 return "OUTROS";
}
function comp(path:string){
 const parts=path.split("/");
 for(const part of parts){
  let m=part.match(/^(0[1-9]|1[0-3])(20\d{2})$/);
  if(m)return {month:Number(m[1]),year:Number(m[2])};
  m=part.match(/^(0[1-9]|1[0-3])(\d{2})$/);
  if(m)return {month:Number(m[1]),year:2000+Number(m[2])};
 }
 const history=path.match(/(?:^|\/)X(20\d{2})(?:\/|$)/);
 return {month:null,year:history?Number(history[1]):null};
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||req.headers.get("Origin")&&req.headers.get("Origin")!==origin)fail("Requisição não permitida.",403);
  const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  const {data:{user},error}=await s.auth.getUser(jwt);
  if(error||!user)fail("Sessão inválida.",401);
  const owner=user.email?.toLowerCase()==="gavsolucoescontabeis@gmail.com"&&!!user.email_confirmed_at&&user.app_metadata?.providers?.includes("google");
  const admin=val(await s.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle());
  if(!owner||!admin)fail("Acesso exclusivo do administrador.",403);
  const b=await req.json(),company=String(b.companyId||"");
  const link=val(await s.from("gav_drive_folders").select("id,drive_folder_id").eq("company_id",company).eq("is_active",true).limit(1).maybeSingle());
  if(!link)fail("Vincule a pasta piloto antes da indexação.",409);
  const t=await access(b),runs=val(await s.from("gav_sync_runs").insert({company_id:company,state:"INICIADO"}).select().single());
  try{
   let count=0,added=0;const queue=[{id:link.drive_folder_id,path:""}],seen=new Set<string>();
   while(queue.length){
    if(seen.size>=180)fail("Mais de 180 pastas no piloto.",409);
    const node=queue.shift()!;if(seen.has(node.id))continue;seen.add(node.id);
    for(const f of await children(node.id,t)){
     if(f.mimeType==="application/vnd.google-apps.folder"){queue.push({id:f.id,path:node.path?node.path+"/"+f.name:f.name});continue}
     if(f.mimeType!=="application/pdf")continue;
     if(++count>1000)fail("Mais de 1000 PDFs, necessário dividir o piloto.",409);
     const old=val(await s.from("gav_documents").select("id").eq("company_id",company).eq("drive_file_id",f.id).maybeSingle());
     const c=comp(node.path),row={file_name:f.name,mime_type:f.mimeType,relative_path:node.path,category:cat(node.path+"/"+f.name),month:c.month,year:c.year,drive_modified_at:f.modifiedTime||null,indexed_at:new Date().toISOString()};
     if(old)val(await s.from("gav_documents").update(row).eq("id",old.id));
     else{val(await s.from("gav_documents").insert({...row,company_id:company,drive_file_id:f.id,drive_folder_link_id:link.id}));added++}
    }
   }
   val(await s.from("gav_sync_runs").update({state:"CONCLUIDO",indexed_count:count,finished_at:new Date().toISOString()}).eq("id",runs.id));
   return new Response(JSON.stringify({indexed:count,newFiles:added,folders:seen.size,autoPublished:0}),{headers:{...cors,"content-type":"application/json"}});
  }catch(e:any){await s.from("gav_sync_runs").update({state:"FALHOU",error_safe:String(e.message).slice(0,150),finished_at:new Date().toISOString()}).eq("id",runs.id);throw e}
 }catch(e:any){return new Response(JSON.stringify({error:String(e.message||"Falha")}),{status:e.status||500,headers:{...cors,"content-type":"application/json"}})}
});