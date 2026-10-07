const CACHE = "egpais-cartas-intencion-v1";

self.addEventListener("install", function(e){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ self.clients.claim(); });

self.addEventListener("fetch", function(e){
  var url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return; // nunca cachear la sincronización

  e.respondWith(
    caches.open(CACHE).then(function(cache){
      return cache.match(e.request).then(function(cached){
        var network = fetch(e.request).then(function(resp){
          if (resp.ok) cache.put(e.request, resp.clone());
          return resp;
        }).catch(function(){ return cached; });
        return cached || network;
      });
    })
  );
});
