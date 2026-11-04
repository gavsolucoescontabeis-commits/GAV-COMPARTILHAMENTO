/* GAV Compartilhar — Web Push opcional. Nunca registra acesso automaticamente. */
let enabled=false,loading=false,publicKey="",status="",activeUser="",invokeApi=null,renderView=()=>{},toast=()=>{};
const supported=()=>typeof window!=="undefined"&&window.isSecureContext&&"serviceWorker" in navigator&&"Notification" in window&&"PushManager" in window;
const preference=()=>activeUser?"gav-push-preference-"+activeUser:"";
const textSafe=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const decodeKey=key=>Uint8Array.from(atob(key.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(key.length/4)*4,"=")),c=>c.charCodeAt(0));
function repaint(){try{renderView()}catch(_error){}}
export function pushCard(){
 const info=!supported()?"O dispositivo ou navegador não permite notificações neste formato. No iPhone, utilize o aplicativo na tela inicial.":
  status||(enabled?"Avisos ativados neste dispositivo. Novos documentos liberados serão anunciados mesmo com o aplicativo fechado.":
   "Opcional: receba um aviso quando a GAV disponibilizar novos documentos. A notificação não mostra dados privados.");
 return '<div class="gav-push-card"><div><strong>Notificações de documentos</strong><small>'+textSafe(info)+'</small></div>'+
  (supported()?'<button type="button" class="btn '+(enabled?'btn-line':'btn-dark')+' btn-small" data-do="push-toggle" '+(loading?'disabled':'')+'>'+
   (loading?'Configurando...':enabled?'Desativar notificações':'Ativar notificações')+'</button>':'')+'</div>';
}
export async function pushInit({userId,invoke,render,notify}){
 activeUser=String(userId||"");
 invokeApi=invoke;renderView=render;toast=notify;
 enabled=false;status="";publicKey="";
 if(!supported()||!activeUser)return;
 const id=activeUser;
 try{
  const registration=await navigator.serviceWorker.ready;
  const subscription=await registration.pushManager.getSubscription();
  const config=await invokeApi("gav-push","config",{endpoint:subscription?.endpoint||""});
  if(id!==activeUser)return;
  publicKey=String(config.publicKey||"");
  const opted=localStorage.getItem(preference())==="1";
  if(subscription&&opted&&Notification.permission==="granted"&&!config.enabled){
   await invokeApi("gav-push","subscribe",{subscription:subscription.toJSON()});
   enabled=true;
  }else{
   enabled=!!(subscription&&config.enabled&&Notification.permission==="granted");
  }
 }catch(_error){
  status="Notificações temporariamente indisponíveis. A consulta aos documentos continua normal.";
  enabled=false;
 }
 if(id===activeUser)repaint();
}
export async function pushToggle(){
 if(!supported()||!activeUser||loading||!invokeApi)return;
 // Disparar o pedido de permissão imediatamente no clique, nunca em segundo plano.
 const permissionRequest=!enabled&&Notification.permission!=="granted"?Notification.requestPermission():null;
 loading=true;status="";repaint();
 try{
  if(!enabled){
   const permission=permissionRequest?await permissionRequest:Notification.permission;
   if(permission!=="granted")throw Error("As notificações não foram autorizadas pelo dispositivo.");
  }
  const registration=await navigator.serviceWorker.ready;
  const current=await registration.pushManager.getSubscription();
  if(enabled){
   if(current)await invokeApi("gav-push","unsubscribe",{endpoint:current.endpoint});
   if(current)await current.unsubscribe();
   if(preference())localStorage.removeItem(preference());
   enabled=false;toast("Notificações desativadas neste dispositivo.");
  }else{
   const key=publicKey||(await invokeApi("gav-push","config",{})).publicKey;
   if(!key)throw Error("Chave de notificação indisponível.");
   const subscription=current||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key)});
   await invokeApi("gav-push","subscribe",{subscription:subscription.toJSON()});
   if(preference())localStorage.setItem(preference(),"1");
   enabled=true;toast("Notificações ativadas. Os próximos documentos liberados serão avisados.");
  }
 }catch(error){
  status=error?.message||"Não foi possível configurar as notificações.";
  toast(status);
 }finally{loading=false;repaint()}
}
export async function pushLogout(){
 if(enabled&&supported()&&invokeApi){
  try{
   const reg=await navigator.serviceWorker.getRegistration("./");
   const subscription=await reg?.pushManager?.getSubscription();
   if(subscription)await invokeApi("gav-push","unsubscribe",{endpoint:subscription.endpoint});
  }catch(_error){/* Nunca impedir a saída por causa das notificações. */}
 }
 activeUser="";enabled=false;publicKey="";status="";loading=false;
}
