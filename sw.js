/* GAV Compartilhamento: rede apenas. Nenhum documento, token ou dado de cliente em cache. */
self.addEventListener("install",()=>{self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim())});
self.addEventListener("fetch",event=>{
 if(event.request.mode==="navigate"&&event.request.method==="GET"){
  event.respondWith(fetch(event.request));
 }
});
