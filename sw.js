const CACHE='voltfare-shell-v6';
const SHELL=['./','./index.html','./app.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('voltfare-shell-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(!SHELL.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
});




