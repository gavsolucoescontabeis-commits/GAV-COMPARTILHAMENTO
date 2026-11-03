/* GAV Compartilhamento: rede apenas. Nenhum documento, token ou dado de cliente em cache. */
self.addEventListener("install",()=>{self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim())});
self.addEventListener("fetch",event=>{
 if(event.request.mode==="navigate"&&event.request.method==="GET"){
  /* Páginas sempre pela rede, sem retornar HTML antigo do cache do navegador. */
  event.respondWith(fetch(event.request,{cache:"no-store"}));
 }
});
