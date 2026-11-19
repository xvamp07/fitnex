/* FITNEX offline v3 branding — files cached for https://<user>.github.io/fitnex/ */
'use strict';
const CACHE_NAME='fitnex-app-shell-v3.0.1';
const CACHE_PREFIX='fitnex-app-shell-';
const ROOT=self.registration.scope;
const ABS=path=>new URL(path,ROOT).href;
const INDEX=ABS('index.html');
const FILES=['./','./index.html','./manifest.webmanifest','./fitnex-192.png','./fitnex-512.png','./apple-touch-icon.png'].map(ABS);
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(FILES);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(ROOT))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request);
        if(response.ok){event.waitUntil(cache.put(INDEX,response.clone()));}
        return response;
      }catch(err){
        const offline=await cache.match(INDEX)||await cache.match(ABS('./'));
        return offline||new Response('FITNEX non è ancora disponibile offline. Apri prima la pagina con Internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok)event.waitUntil(cache.put(request,response.clone()));
      return response;
    }catch{return Response.error()}
  })());
});
