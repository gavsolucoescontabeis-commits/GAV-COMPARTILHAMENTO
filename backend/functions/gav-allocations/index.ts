import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";

const db=createClient(Deno.env.get("SUPABASE_URL")!,
 (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
 {auth:{persistSession:false,autoRefreshToken:false}});
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const respond=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json;charset=UTF-8"}});
function fail(msg:string,status=400):never{throw {message:msg,status}}
function data(r:any):any{if(r.error){console.error("allocations query",r.error.code);fail("Não foi possível acessar os dados das alocações.",502)}return r.data}
const digits=(s:any)=>String(s||"").replace(/\D/g,"");
const safeName=(s:any)=>String(s||"").normalize("NFC").trim().replace(/\s+/g," ");

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||(req.headers.get("origin")&&req.headers.get("origin")!==origin))fail("Origem não permitida.",403);
  const token=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  if(!token)fail("Entre na conta para usar as alocações.",401);
  const {data:auth,error:authError}=await db.auth.getUser(token);
  const user=auth?.user;
  if(authError||!user||!user.email_confirmed_at)fail("Sessão não autorizada.",401);
  const isGavOwner=user.email?.toLowerCase()==="gavsolucoescontabeis@gmail.com" &&
    user.app_metadata?.providers?.includes("google");
  const admin=isGavOwner && !!data(await db.from("gav_admin_users").select("user_id")
    .eq("user_id",user.id).eq("active",true).maybeSingle());
  if(!admin&&user.app_metadata?.gav_password_change_required===true)fail("Troque sua senha antes de continuar.",403);
  const body=await req.json(),action=String(body.action||"");
  if(action==="enabledCompanies"){
   const ttm=data(await db.from("gav_offices").select("id").eq("code","TTM").maybeSingle());
   if(!ttm)return respond({companyIds:[]});
   let permitted:any[]=[];
   if(admin){
    permitted=data(await db.from("gav_companies").select("id")
      .eq("office_id",ttm.id).eq("is_active",true).eq("allocations_enabled",true));
   }else{
    const memberships=data(await db.from("gav_memberships")
      .select("company_id").eq("user_id",user.id).eq("active",true).eq("password_change_required",false));
    const ids=memberships.map((x:any)=>x.company_id);
    if(ids.length)permitted=data(await db.from("gav_companies").select("id")
      .eq("office_id",ttm.id).eq("is_active",true).eq("allocations_enabled",true).in("id",ids));
   }
   return respond({companyIds:permitted.map((x:any)=>x.id)});
  }
  if(!["list","saveLine","deleteLine","registerWorksite"].includes(action))fail("Ação inválida.",400);
  const companyId=String(body.companyId||"");
  const company=data(await db.from("gav_companies").select("id,office_id,code,is_active,allocations_enabled")
    .eq("id",companyId).eq("is_active",true).maybeSingle());
  if(!company)fail("Empresa não cadastrada ou inativa.",404);
  const office=data(await db.from("gav_offices").select("id,code")
    .eq("id",company.office_id).maybeSingle());
  if(!office||office.code!=="TTM")fail("Alocações disponíveis somente para empresas da TTM.",403);
  if(!company.allocations_enabled)fail("Alocações não habilitadas no cadastro desta empresa.",403);
  if(!admin){
   const member=data(await db.from("gav_memberships")
    .select("company_id,password_change_required").eq("company_id",companyId)
    .eq("user_id",user.id).eq("active",true).maybeSingle());
   if(!member||member.password_change_required)fail("Esta empresa não está autorizada para o seu acesso.",403);
  }
  const year=Number(body.year),month=Number(body.month);
  if(!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(month)||month<1||month>12)
   fail("Competência inválida.",400);
  if(action==="list"){
   const [workers,lines,sites]=await Promise.all([
    db.from("gav_allocation_employees")
      .select("employee_code,employee_name,source_department,suggested_cno,imported_at")
      .eq("company_id",companyId).eq("year",year).eq("month",month).order("employee_code").limit(600),
    db.from("gav_allocation_lines")
      .select("id,employee_code,line_no,days_worked,absences,cno,manual_work_name,updated_at")
      .eq("company_id",companyId).eq("year",year).eq("month",month).order("employee_code").order("line_no").limit(1800),
    db.from("gav_allocation_worksites").select("cno,work_name")
      .eq("office_id",office.id).order("work_name").limit(600)
   ]);
   return respond({companyId,year,month,workers:data(workers),lines:data(lines),sites:data(sites)});
  }
  if(action==="registerWorksite"){
   const cno=digits(body.cno),name=safeName(body.workName);
   if(!/^\d{12}$/.test(cno)||name.length<2||name.length>180)fail("Informe CNO de 12 dígitos e nome da obra.",400);
   const found=data(await db.from("gav_allocation_worksites").select("cno,work_name").eq("office_id",office.id).eq("cno",cno).maybeSingle());
   if(found)return respond({site:found,existing:true});
   const newSite=data(await db.from("gav_allocation_worksites").insert({office_id:office.id,cno,work_name:name,updated_by:user.id})
     .select("cno,work_name").single());
   return respond({site:newSite,existing:false});
  }
  const employeeCode=String(body.employeeCode||"").trim(),lineNo=Number(body.lineNo);
  if(!/^\d{4,6}-\d{1,2}$/.test(employeeCode)||!Number.isInteger(lineNo)||lineNo<1||lineNo>30)
   fail("Código ou linha de alocação inválidos.",400);
  const worker=data(await db.from("gav_allocation_employees").select("employee_code")
   .eq("company_id",companyId).eq("year",year).eq("month",month)
   .eq("employee_code",employeeCode).maybeSingle());
  if(!worker)fail("Empregado não encontrado no relatório da empresa e competência.",404);
  if(action==="deleteLine"){
   data(await db.from("gav_allocation_lines").delete()
    .eq("company_id",companyId).eq("year",year).eq("month",month)
    .eq("employee_code",employeeCode).eq("line_no",lineNo));
   return respond({ok:true});
  }
  const days=Number(body.daysWorked),absences=Number(body.absences);
  if(!Number.isInteger(days)||days<0||days>31||!Number.isInteger(absences)||absences<0||absences>31)
   fail("Informe números inteiros de dias e faltas entre 0 e 31.",400);
  if(lineNo>1&&absences!==0)fail("As faltas devem ser informadas apenas na primeira linha do empregado.",400);
  const cno=digits(body.cno),manualName=safeName(body.workName);
  if(cno&&cno.length!==12)fail("O CNO precisa ter 12 números.",400);
  if(manualName.length>180)fail("Nome da obra muito longo.",400);
  if(days>0&&!cno&&manualName.length<2)fail("Escolha uma obra ou informe o nome para lançar dias trabalhados.",400);
  if(cno){
   const found=data(await db.from("gav_allocation_worksites").select("cno")
      .eq("office_id",office.id).eq("cno",cno).maybeSingle());
   if(!found){
    if(manualName.length<2)fail("CNO ainda não cadastrado. Informe o nome da obra.",400);
    data(await db.from("gav_allocation_worksites").upsert({
      office_id:office.id,cno,work_name:manualName,updated_by:user.id
    },{onConflict:"office_id,cno",ignoreDuplicates:true}));
   }
  }
  const others=data(await db.from("gav_allocation_lines").select("days_worked")
    .eq("company_id",companyId).eq("year",year).eq("month",month)
    .eq("employee_code",employeeCode).neq("line_no",lineNo));
  const sum=others.reduce((n:number,x:any)=>n+Number(x.days_worked||0),0)+days;
  if(sum>31)fail("O empregado não pode ter mais de 31 dias trabalhados entre as obras na mesma competência.",409);
  const result=data(await db.from("gav_allocation_lines").upsert({
    company_id:companyId,year,month,employee_code:employeeCode,line_no:lineNo,
    days_worked:days,absences:lineNo===1?absences:0,cno:cno||null,
    manual_work_name:cno?null:(manualName||null),updated_by:user.id,updated_at:new Date().toISOString()
   },{onConflict:"company_id,year,month,employee_code,line_no"})
    .select("id,employee_code,line_no").single());
  return respond({ok:true,line:result});
 }catch(e:any){return respond({error:String(e?.message||"Falha na gravação das alocações.")},e?.status||500)}
});