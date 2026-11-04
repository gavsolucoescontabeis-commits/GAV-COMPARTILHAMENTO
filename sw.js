/* GAV Compartilhamento: rede apenas. Nenhum documento, token ou dado de cliente em cache. */
self.addEventListener("install",()=>{self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim())});
self.addEventListener("fetch",event=>{
 if(event.request.mode==="navigate"&&event.request.method==="GET"){
  /* Páginas sempre pela rede, sem retornar HTML antigo do cache do navegador. */
  event.respondWith(fetch(event.request,{cache:"no-store"}));
 }
});

/* Web Push opt-in: o aviso nunca contém nomes, CNPJ ou dados dos documentos. */
self.addEventListener("push",event=>{
 let data={};
 try{data=event.data?event.data.json():{}}catch(_error){}
 const tag=typeof data.tag==="string"&&data.tag.length<120?data.tag:"gav-documentos";
 event.waitUntil(self.registration.showNotification("GAV Compartilhar",{
  body:"A GAV disponibilizou novos documentos. Abra o aplicativo para consultar.",
  icon:"./assets/gav-leao-master.png",tag,renotify:false
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const url=new URL("./",self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async windows=>{
  const existing=windows.find(w=>w.url.startsWith(self.registration.scope));
  if(existing){await existing.focus();return}
  if(self.clients.openWindow)await self.clients.openWindow(url);
 }));
});
