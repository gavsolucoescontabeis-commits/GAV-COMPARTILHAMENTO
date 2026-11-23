import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";
const db=createClient(Deno.env.get("SUPABASE_URL")!,
 (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
 {auth:{persistSession:false,autoRefreshToken:false}});
const origin="https://gavsolucoescontabeis-commits.github.io";
const cors={"Access-Control-Allow-Origin":origin,
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff"};
function respond(x:any,status=200){return new Response(JSON.stringify(x),
 {status,headers:{...cors,"Content-Type":"application/json;charset=utf-8"}})}
function fail(msg:string,status=400):never{throw {message:msg,status}}
function get<T=any>(r:{data:T,error:any}):T{
 if(r.error){console.error("experience db error",r.error.code);fail("Não foi possível consultar o relatório de experiência.",502)}
 return r.data;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST"||(req.headers.get("Origin")&&req.headers.get("Origin")!==origin))
   fail("Origem não autorizada.",403);
  const token=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
  if(!token)fail("Entre na conta da sua empresa.",401);
  const {data:auth,error:authError}=await db.auth.getUser(token);
  const user=auth?.user;
  if(authError||!user||!user.email_confirmed_at)fail("Sessão não autorizada.",401);
  const isOwner=user.email?.toLowerCase()==="gavsolucoescontabeis@gmail.com"&&
   user.app_metadata?.providers?.includes("google");
  const admin=isOwner&&!!get(await db.from("gav_admin_users").select("user_id")
   .eq("user_id",user.id).eq("active",true).maybeSingle());
  if(!admin&&user.app_metadata?.gav_password_change_required===true)
   fail("Troque a senha provisória antes de consultar os empregados.",403);
  const b=await req.json();
  if(b.action!=="list")fail("Operação inválida.",400);
  const companyId=String(b.companyId||"");
  if(!/^[0-9a-f-]{36}$/i.test(companyId))fail("Empresa inválida.",400);
  const company=get(await db.from("gav_companies")
   .select("id,legal_name,office_id,is_active").eq("id",companyId).eq("is_active",true).maybeSingle());
  if(!company)fail("Empresa não cadastrada ou inativa.",404);
  if(!admin){
   if(user.app_metadata?.gav_account_kind!=="client")fail("Acesso não autorizado.",403);
   const permitted=get(await db.from("gav_memberships").select("company_id,password_change_required")
    .eq("user_id",user.id).eq("company_id",companyId).eq("active",true).maybeSingle());
   if(!permitted||permitted.password_change_required)
    fail("Acesso aos empregados desta empresa não autorizado.",403);
  }
  const rows=get(await db.from("gav_employee_experience").select(
   "employee_code,employee_name,job_title,admission_date,termination_date,first_days,second_days,contract_status,source_year,source_month,updated_at"
  ).eq("company_id",companyId).order("admission_date",{ascending:false}).limit(900));
  // Nunca retornar empregados de outra empresa. Nenhum CPF ou salário no payload.
  return respond({companyId,companyName:company.legal_name,
   employees:rows,model:"45+45",basis:"CONTAGEM_INCLUSIVA",
   note:"As datas calculadas pelo modelo 45+45 são previsões. Confira o contrato individual, eventuais prorrogações, desligamentos e afastamentos antes de tomar decisões."});
 }catch(e:any){return respond({error:String(e?.message||"Falha ao consultar experiência.")},e?.status||500)}
});
