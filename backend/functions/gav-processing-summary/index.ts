import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";

const database=createClient(
  Deno.env.get("SUPABASE_URL")!,
  (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
  {auth:{persistSession:false,autoRefreshToken:false}}
);
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const respond=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:{...cors,"Content-Type":"application/json"}});
function fail(message:string,status=400):never{throw {message,status}}
function check<T=any>(r:{data:T,error:any}):T{
 if(r.error){console.error("gav-processing query",r.error.code);fail("Não foi possível consultar o processamento.",502)}
 return r.data;
}
function normalized(value:any):string{
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
}
function evidence(doc:any,year:number,month:number):"darf"|"fgts"|"dctf"|"gps"|null{
 if(doc.mime_type && !["application/pdf","image/jpeg","image/png","image/webp"].includes(doc.mime_type))return null;
 const filename=normalized(doc.file_name),path=normalized(doc.relative_path);
 const segments=path.split(" ");
 if(segments.some((v:string)=>["RES","RESCISAO","RESCISOES","FER","FERIAS","ADM","ADMISSAO","ADMISSOES"].includes(v)))return null;
 if(/\b(RESCISAO|RESCISORIO|FERIAS|PARCELAMENTO|PARCELA|ATRASO|MULTA|MAED)\b/.test(filename))return null;
 if(/\b(RELATORIO|PLANILHA|EXTRATO|RESUMO|CALCULO|PROJECAO|SIMULACAO)\b/.test(filename))return null;
 // Competencia no nome do arquivo deve coincidir com a pasta indexada.
 const six=filename.match(/(?:^|\s)(0[1-9]|1[0-3])(20\d{2})(?=\s|$)/);
 const four=!six&&filename.match(/(?:^|\s)(0[1-9]|1[0-3])(\d{2})(?=\s|$)/);
 const identified=six?{month:Number(six[1]),year:Number(six[2])}:four?{month:Number(four[1]),year:2000+Number(four[2])}:null;
 if(identified&&(identified.month!==month||identified.year!==year))return null;
 if(/^GPS\b/.test(filename)&&identified)return "gps";
 if(/\bRECIBO\b.*\bDCTF\s*WEB\b|\bDCTF\s*WEB\b.*\bRECIBO\b/.test(filename))return "dctf";
 if(/\bDARF\b\s+(?:DCTF\s*WEB\s+)?(?:INSS|INNS|INSSS|PREVIDENCIARIO|PREVIDENCIA|FOLHA)\b/.test(filename))return "darf";
 if(/^(?:FGTS\b|GUIA\s+(?:DE\s+RECOLHIMENTO\s+DO\s+|DO\s+)?FGTS\b|GRF\b|COMPROVANTE\s+(?:DE\s+)?(?:PAGAMENTO\s+)?FGTS\b)/.test(filename))return "fgts";
 return null;
}

// DARF mensal de parcelamento: aceita arquivo sem competência no nome somente quando
// indexado na pasta da competência. Documento atrasado/de outro mês não fecha o período.
function installmentEvidence(doc:any,year:number,month:number):boolean{
 if(doc.mime_type && !["application/pdf","image/jpeg","image/png","image/webp"].includes(doc.mime_type))return false;
 const filename=normalized(doc.file_name),path=normalized(doc.relative_path);
 if(!/^DARF (?:PARCELAMENTO|PARC)\b/.test(filename))return false;
 if(/\b(ATRASO|ATRASADO|ATRASADA|RESCISAO|RESCISORIO|RELATORIO|EXTRATO|RESUMO|SIMULACAO)\b/.test(filename))return false;
 if(path.split(" ").some((v:string)=>["RES","RESCISAO","RESCISOES","FER","FERIAS","ADM","ADMISSAO","ADMISSOES"].includes(v)))return false;
 const six=filename.match(/(?:^|\s)(0[1-9]|1[0-3])(20\d{2})(?=\s|$)/);
 const four=!six&&filename.match(/(?:^|\s)(0[1-9]|1[0-3])(\d{2})(?=\s|$)/);
 const identified=six?{month:Number(six[1]),year:Number(six[2])}:four?{month:Number(four[1]),year:2000+Number(four[2])}:null;
 if(identified&&(identified.month!==month||identified.year!==year))return false;
 return true;
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||(req.headers.get("origin")&&req.headers.get("origin")!==origin))fail("Origem não permitida.",403);
  const token=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  if(!token)fail("Acesso administrativo necessário.",401);
  const {data:{user},error}=await database.auth.getUser(token);
  if(error||!user||user.email?.toLowerCase()!=="gavsolucoescontabeis@gmail.com"||
    !user.email_confirmed_at||!user.app_metadata?.providers?.includes("google"))fail("Apenas a administração GAV.",403);
  const admin=check(await database.from("gav_admin_users").select("user_id").eq("user_id",user.id).eq("active",true).maybeSingle());
  if(!admin)fail("Acesso administrativo inativo.",403);
  const body=await req.json();
  if(!["summary","markWithoutMovement","resumeMovement"].includes(body.action))fail("Ação inválida.",400);
  const officeId=String(body.officeId||"");
  const year=Number(body.year),month=Number(body.month);
  if(!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(month)||month<1||month>13)fail("Competência inválida.",400);
  const office=check(await database.from("gav_offices").select("id,code,display_name").eq("id",officeId).maybeSingle());
  if(!office)fail("Escritório não encontrado.",404);
  if(body.action==="markWithoutMovement"||body.action==="resumeMovement"){
   const companyId=String(body.companyId||"");
   const company=check(await database.from("gav_companies")
      .select("id,legal_name").eq("id",companyId).eq("office_id",officeId).eq("is_active",true).maybeSingle());
   if(!company)fail("Empresa não encontrada neste escritório.",404);
   const service=check(await database.from("gav_services").select("service_key")
      .eq("company_id",companyId).eq("service_key","FOLHA").eq("scope_status","CONFIRMADO").maybeSingle());
   if(!service)fail("A empresa não possui Folha confirmada.",409);
   const active=check(await database.from("gav_processing_inactivity")
      .select("id,start_year,start_month")
      .eq("company_id",companyId).eq("service_key","FOLHA").is("end_year",null).maybeSingle());
   if(body.action==="markWithoutMovement"){
     if(active)fail("O serviço já está marcado sem movimento. Use Reativar quando houver movimento.",409);
     check(await database.from("gav_processing_inactivity").insert({
       company_id:companyId,service_key:"FOLHA",start_year:year,start_month:month,
       note:"Sem movimento informado pela administração GAV",created_by:user.id
     }).select("id").single());
     return respond({ok:true,status:"SEM_MOVIMENTO",startYear:year,startMonth:month});
   }
   if(!active)fail("Não existe marcação ativa de sem movimento para esta empresa.",409);
   if(year*13+month < Number(active.start_year)*13+Number(active.start_month))
      fail("A retomada deve ocorrer na competência inicial ou em uma posterior.",409);
   check(await database.from("gav_processing_inactivity").update({
      end_year:year,end_month:month,ended_by:user.id,ended_at:new Date().toISOString()
   }).eq("id",active.id).is("end_year",null).select("id").single());
   return respond({ok:true,status:"RETOMADO",endYear:year,endMonth:month});
  }
  const companyRows=check(await database.from("gav_companies").select("id,code,legal_name,cnpj").eq("office_id",officeId).eq("is_active",true).order("code"));
  const ids=companyRows.map((c:any)=>c.id);
  if(!ids.length)return respond({officeId,year,month,companies:[],total:0,concluded:0,pending:0});
  const services=check(await database.from("gav_services").select("company_id,service_key").in("service_key",["FOLHA","PARCELAMENTOS"]).eq("scope_status","CONFIRMADO").in("company_id",ids));
  const selectedCompanies=companyRows.flatMap((c:any)=>services.filter((service:any)=>service.company_id===c.id).map((service:any)=>({...c,serviceKey:service.service_key})));
  if(!selectedCompanies.length)return respond({officeId,year,month,companies:[],total:0,concluded:0,pending:0});
  const selected=[...new Set(selectedCompanies.map((c:any)=>c.id))];
  const inactivePeriods=check(await database.from("gav_processing_inactivity")
     .select("company_id,service_key,start_year,start_month,end_year,end_month")
     .in("company_id",selected).eq("service_key","FOLHA"));
  const activePeriod=(companyId:string,serviceKey:string)=>{
    if(serviceKey!=="FOLHA")return null;
    const target=year*13+month;
    return inactivePeriods.find((p:any)=>
       p.company_id===companyId && p.service_key===serviceKey &&
       Number(p.start_year)*13+Number(p.start_month)<=target &&
       (p.end_year===null || target<Number(p.end_year)*13+Number(p.end_month)))||null;
  };
  const found:any[]=[];
  for(let page=0;page<30;page++){
   const results=check(await database.from("gav_documents")
     .select("id,company_id,file_name,mime_type,relative_path,year,month,review_status")
     .in("company_id",selected).eq("year",year).eq("month",month)
     .in("review_status",["PENDENTE","APROVADO"])
     .order("id").range(page*500,page*500+499));
   found.push(...results);
   if(results.length<500)break;
   if(page===29)fail("Muitos documentos para esta competência. Faça a conferência em partes.",409);
  }
  const evidenceByCompany=new Map<string,any>();
  for(const d of found){
   const kind=evidence(d,year,month);
   const installment=installmentEvidence(d,year,month);
   if(!kind&&!installment)continue;
   if(!evidenceByCompany.has(d.company_id))evidenceByCompany.set(d.company_id,{darf:null,fgts:null,dctf:null,gps:null,parcelamento:null});
   const flags=evidenceByCompany.get(d.company_id);
   if(kind&&!flags[kind])flags[kind]={id:d.id,name:d.file_name};
   if(installment&&!flags.parcelamento)flags.parcelamento={id:d.id,name:d.file_name};
  }
  const companies=selectedCompanies.map((c:any)=>{
   const records=evidenceByCompany.get(c.id)||{darf:null,fgts:null,dctf:null,gps:null,parcelamento:null};
   const parcelService=c.serviceKey==="PARCELAMENTOS";
   const concluded=parcelService?!!records.parcelamento:
     !!records.gps||!!records.dctf||!!(records.darf&&records.fgts);
   const withoutMovement=activePeriod(c.id,c.serviceKey);
   const reason=withoutMovement?
      "Sem movimento registrado pela GAV desde "+String(withoutMovement.start_month).padStart(2,"0")+"/"+withoutMovement.start_year+" (controle interno)":
     parcelService?
      (records.parcelamento?"DARF de parcelamento da competência localizado":"DARF de parcelamento da competência não localizado"):
     records.gps?"GPS da competência localizada":
     records.dctf?"Recibo de entrega da DCTFWeb localizado":
     records.darf&&records.fgts?"DARF de INSS e guia mensal do FGTS localizados":
     "Faltam documentos para o fechamento documental";
   return {id:c.id,code:c.code,legalName:c.legal_name,cnpj:c.cnpj,serviceKey:c.serviceKey,
     serviceLabel:parcelService?"Parcelamentos":"Folha",
     status:withoutMovement?"SEM_MOVIMENTO":concluded?"CONCLUIDA":"PENDENTE",reason,evidence:records};
  });
  return respond({officeId,year,month,companies,total:companies.length,
    concluded:companies.filter((c:any)=>c.status==="CONCLUIDA").length,
    pending:companies.filter((c:any)=>c.status==="PENDENTE").length,
    withoutMovement:companies.filter((c:any)=>c.status==="SEM_MOVIMENTO").length,
    checkedDocuments:found.length});
 }catch(e:any){return respond({error:String(e?.message||"Falha ao conferir o processamento.")},e?.status||500)}
});