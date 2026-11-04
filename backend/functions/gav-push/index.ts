import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.76.1";
import webpush from "npm:web-push@3.6.7";

const origin="https://gavsolucoescontabeis-commits.github.io";
const appUrl=origin+"/GAV-COMPARTILHAMENTO/";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info,x-gav-internal-token","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const secret=(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
const db=createClient(Deno.env.get("SUPABASE_URL")!,secret,{auth:{autoRefreshToken:false,persistSession:false}});
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json",...cors}});
function fail(message:string,status=400):never{throw {message,status};}
function val(r:any){if(r.error){console.error("GAV push database",r.error.code);fail("Não foi possível concluir a operação.",502)}return r.data}
function b64(bytes:Uint8Array){let s="";for(const v of bytes)s+=String.fromCharCode(v);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function validEndpoint(v:unknown){
 if(typeof v!=="string"||v.length<40||v.length>2048)return false;
 try{
  const u=new URL(v);
  const host=u.hostname.toLowerCase();
  return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&
   (host==="fcm.googleapis.com"||host==="updates.push.services.mozilla.com"||
    host==="push.services.mozilla.com"||host==="web.push.apple.com"||
    host.endsWith(".push.apple.com")||host.endsWith(".notify.windows.com"));
 }catch(_e){return false}
}
async function vapid(){
 const existing=val(await db.rpc("gav_push_read_vapid"));
 if(existing?.[0]?.public_key&&existing[0]?.private_key)return existing[0];
 const pair=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
 const publicKey=b64(new Uint8Array(await crypto.subtle.exportKey("raw",pair.publicKey)));
 const privateJwk=await crypto.subtle.exportKey("jwk",pair.privateKey);
 if(!privateJwk.d)fail("Não foi possível preparar notificações.",502);
 val(await db.rpc("gav_push_init_vapid",{p_public:publicKey,p_private:privateJwk.d}));
 const loaded=val(await db.rpc("gav_push_read_vapid"));
 if(!loaded?.[0]?.public_key||!loaded[0].private_key)fail("Chaves de notificação indisponíveis.",502);
 return loaded[0];
}
async function dispatch(){
 const pending=val(await db.from("gav_push_outbox").select("id,company_id,document_id").is("processed_at",null).order("id").limit(900));
 if(!pending.length)return {ok:true,events:0,notifications:0};
 const grouped=new Map<string,typeof pending>();
 for(const item of pending){if(!grouped.has(item.company_id))grouped.set(item.company_id,[]);grouped.get(item.company_id)!.push(item);}
 const settings=await vapid();
 webpush.setVapidDetails("mailto:gavsolucoescontabeis@gmail.com",settings.public_key,settings.private_key);
 let sent=0,completed=0;
 for(const [companyId,events] of grouped){
  const docIds=[...new Set(events.map(e=>e.document_id))];
  const docs=val(await db.from("gav_documents").select("id").eq("company_id",companyId)
    .in("id",docIds).eq("review_status","APROVADO").not("published_at","is",null));
  const company=val(await db.from("gav_companies").select("id").eq("id",companyId).eq("is_active",true).maybeSingle());
  if(docs.length&&company){
   const members=val(await db.from("gav_memberships").select("user_id")
     .eq("company_id",companyId).eq("active",true).eq("password_change_required",false));
   const userIds=[...new Set(members.map((m:any)=>m.user_id))];
   if(userIds.length){
    const subs=val(await db.from("gav_push_subscriptions").select("endpoint,user_id,p256dh,auth_secret")
      .in("user_id",userIds).eq("enabled",true).limit(300));
    const message=JSON.stringify({
     title:"GAV Compartilhar · Novos documentos",
     body:"A GAV disponibilizou documentos para sua consulta. Abra o aplicativo para verificar.",
     tag:"gav-documentos-"+companyId,url:appUrl
    });
    const results=await Promise.allSettled(subs.filter((s:any)=>validEndpoint(s.endpoint)).map(async (s:any)=>{
     try{
      await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_secret}},message,{TTL:86400,urgency:"normal"});
      sent++;
     }catch(e:any){
      if([404,410].includes(Number(e?.statusCode)))await db.from("gav_push_subscriptions").delete().eq("endpoint",s.endpoint);
      else console.warn("Falha transitória ao enviar Web Push",Number(e?.statusCode)||"rede");
     }
    }));
    if(results.some(r=>r.status==="rejected"))console.warn("Avisos parcialmente indisponíveis");
   }
  }
  val(await db.from("gav_push_outbox").update({processed_at:new Date().toISOString()})
    .in("id",events.map(e=>e.id)).is("processed_at",null));
  completed+=events.length;
 }
 return {ok:true,events:completed,notifications:sent};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 try{
  if(req.method!=="POST")fail("Método inválido.",405);
  if(req.headers.get("Origin")&&req.headers.get("Origin")!==origin)fail("Origem não autorizada.",403);
  const body=await req.json();
  const action=String(body.action||"");
  if(action==="dispatch"){
   const token=req.headers.get("x-gav-internal-token")||"";
   if(token.length!==64||val(await db.rpc("gav_push_valid_scheduler",{p_token:token}))!==true)
     fail("Agendamento inválido.",403);
   return reply(await dispatch());
  }
  const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer /i,"");
  if(!jwt)fail("Faça login para configurar notificações.",401);
  const {data:{user},error}=await db.auth.getUser(jwt);
  if(error||!user)fail("Sessão inválida.",401);
  const memberships=val(await db.from("gav_memberships").select("company_id").eq("user_id",user.id).eq("active",true).limit(1));
  if(!memberships.length)fail("Notificações exclusivas de clientes autorizados.",403);
  if(action==="config"){
   const keys=await vapid();
   const endpoint=String(body.endpoint||"");
   const own=endpoint&&validEndpoint(endpoint)?val(await db.from("gav_push_subscriptions")
    .select("enabled").eq("user_id",user.id).eq("endpoint",endpoint).maybeSingle()):null;
   return reply({publicKey:keys.public_key,enabled:!!own?.enabled});
  }
  if(action==="subscribe"){
   const sub=body.subscription||{},endpoint=sub.endpoint,keys=sub.keys||{};
   if(!validEndpoint(endpoint)||typeof keys.p256dh!=="string"||typeof keys.auth!=="string"||
      !/^[A-Za-z0-9_-]{80,160}$/.test(keys.p256dh)||
      !/^[A-Za-z0-9_-]{16,100}$/.test(keys.auth))
     fail("Assinatura do navegador inválida.",400);
   val(await db.from("gav_push_subscriptions").upsert({
     endpoint,user_id:user.id,p256dh:keys.p256dh,auth_secret:keys.auth,
     enabled:true,updated_at:new Date().toISOString()
   },{onConflict:"endpoint"}));
   return reply({ok:true,enabled:true});
  }
  if(action==="unsubscribe"){
   const endpoint=String(body.endpoint||"");
   if(validEndpoint(endpoint))
    val(await db.from("gav_push_subscriptions").delete().eq("user_id",user.id).eq("endpoint",endpoint));
   return reply({ok:true,enabled:false});
  }
  fail("Ação não encontrada.",404);
 }catch(e:any){return reply({error:String(e?.message||"Serviço de notificações indisponível.")},e?.status||500)}
});
