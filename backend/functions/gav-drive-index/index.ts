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
  if(out.length>5000)fail("Pasta possui mais de 5000 itens. Sincronização por partes necessária.",409);
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
  const internalToken=req.headers.get("x-gav-internal-token");
  const isScheduled=internalToken!==null;
  if(isScheduled){
   if(internalToken.length<40||internalToken.length>150)fail("Agendamento inválido.",403);
   const validated=val(await s.rpc("gav_validate_drive_scheduler",{p_token:internalToken}));
   if(validated!==true)fail("Agendamento não autorizado.",403);
  }else{
   const jwt=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
   const {data:{user},error}=await s.auth.getUser(jwt);
   if(error||!user)fail("Sessão inválida.",401);
   const owner=user.email?.toLowerCase()==="gavsolucoescontabeis@gmail.com"&&!!user.email_confirmed_at&&user.app_metadata?.providers?.includes("google");
   const admin=val(await s.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle());
   if(!owner||!admin)fail("Acesso exclusivo do administrador.",403);
  }
  const body=await req.json(),company=String(body.companyId||"");
  const b=isScheduled?{}:body;
  const link=val(await s.from("gav_drive_folders").select("id,drive_folder_id,auto_publish_new").eq("company_id",company).eq("is_active",true).limit(1).maybeSingle());
  if(!link)fail("Empresa sem pasta vinculada.",403);
  if(isScheduled&&!link.auto_publish_new){
   const verified=val(await s.from("gav_drive_candidates").select("company_id").eq("company_id",company).not("verified_at","is",null).maybeSingle());
   if(!verified)fail("Pasta não verificada para importação protegida.",403);
  }
  const recently=new Date(Date.now()-4*60*1000).toISOString();
  const running=val(await s.from("gav_sync_runs").select("id").eq("company_id",company)
    .eq("state","INICIADO").gte("started_at",recently).limit(1));
  if(running.length)fail("Já existe uma sincronização desta empresa em andamento.",409);
  const t=await access(b),runs=val(await s.from("gav_sync_runs").insert({company_id:company,state:"INICIADO"}).select().single());
  try{
   let count=0,added=0,autoPublished=0;
   const previous:any[]=[];
   for(let offset=0;offset<10000;offset+=1000){
    const chunk=val(await s.from("gav_documents").select("id,drive_file_id,drive_modified_at,file_name,relative_path,category,month,year,review_status").eq("company_id",company).range(offset,offset+999));
    previous.push(...chunk);if(chunk.length<1000)break;
   }
   const inserts:any[]=[];
   const known=new Map(previous.map((d:any)=>[d.drive_file_id,d]));
   const queue=[{id:link.drive_folder_id,path:""}],seen=new Set<string>(),presentFiles=new Set<string>();
   while(queue.length){
    if(seen.size>=700)fail("Mais de 700 pastas em uma empresa. Importação por partes necessária.",409);
    const node=queue.shift()!;if(seen.has(node.id))continue;seen.add(node.id);
    for(const f of await children(node.id,t)){
     if(f.mimeType==="application/vnd.google-apps.folder"){queue.push({id:f.id,path:node.path?node.path+"/"+f.name:f.name});continue}
     if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(f.mimeType))continue;
     if(++count>6000)fail("Mais de 6000 documentos em uma empresa. Importação por partes necessária.",409);
     presentFiles.add(f.id);
     const old=known.get(f.id);
     const c=comp(node.path),row={file_name:f.name,mime_type:f.mimeType,relative_path:node.path,category:cat(node.path+"/"+f.name),month:c.month,year:c.year,drive_modified_at:f.modifiedTime||null,indexed_at:new Date().toISOString()};
     if(old){
      // Não sobrescrever publicação nem bloqueio manual durante a sincronização.
      const changed=old.file_name!==row.file_name||old.relative_path!==row.relative_path||old.category!==row.category||
       old.month!==row.month||old.year!==row.year||
       (old.drive_modified_at?new Date(old.drive_modified_at).getTime():0)!==(row.drive_modified_at?new Date(row.drive_modified_at).getTime():0);
      if(old.review_status==="REMOVIDO"){
       val(await s.from("gav_documents").update({...row,
        review_status:link.auto_publish_new?"APROVADO":"PENDENTE",
        published_at:link.auto_publish_new?new Date().toISOString():null}).eq("id",old.id).eq("company_id",company));
       if(link.auto_publish_new)autoPublished++;
      }else if(changed)val(await s.from("gav_documents").update(row).eq("id",old.id).eq("company_id",company));
     }else{
      const visible=link.auto_publish_new===true;
      inserts.push({...row,company_id:company,drive_file_id:f.id,drive_folder_link_id:link.id,
       review_status:visible?"APROVADO":"PENDENTE",published_at:visible?new Date().toISOString():null});
      added++;if(visible)autoPublished++;
     }
    }
   }
   // Inserções agrupadas: importa centenas de documentos sem uma chamada SQL por arquivo.
   for(let i=0;i<inserts.length;i+=100){
    val(await s.from("gav_documents").insert(inserts.slice(i,i+100)));
   }
   // Arquivos apagados ou movidos para fora da pasta deixam de estar acessíveis.
   const removed=previous.filter((d:any)=>!presentFiles.has(d.drive_file_id)&&d.review_status!=="REMOVIDO"&&d.review_status!=="BLOQUEADO");
   if(removed.length){
    val(await s.from("gav_documents").update({review_status:"REMOVIDO",published_at:null})
     .eq("company_id",company).in("id",removed.map((d:any)=>d.id)));
   }
   const finishedAt=new Date().toISOString();
   val(await s.from("gav_drive_folders").update({last_synced_at:finishedAt,last_indexed_count:count})
    .eq("id",link.id).eq("company_id",company));
   val(await s.from("gav_sync_runs").update({state:"CONCLUIDO",indexed_count:count,finished_at:finishedAt}).eq("id",runs.id));
   return new Response(JSON.stringify({indexed:count,newFiles:added,removedFiles:removed.length,folders:seen.size,autoPublished}),{headers:{...cors,"content-type":"application/json"}});
  }catch(e:any){await s.from("gav_sync_runs").update({state:"FALHOU",error_safe:String(e.message).slice(0,150),finished_at:new Date().toISOString()}).eq("id",runs.id);throw e}
 }catch(e:any){return new Response(JSON.stringify({error:String(e.message||"Falha")}),{status:e.status||500,headers:{...cors,"content-type":"application/json"}})}
});