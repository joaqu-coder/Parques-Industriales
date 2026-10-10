// Subir la versión del cache cuando cambia index.html: sin eso, el navegador
// sirve la copia vieja en la primera carga posterior al deploy.
const CACHE = "egpais-cartas-intencion-v3";

self.addEventListener("install", function(e){ self.skipWaiting(); });
self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE; })
                             .map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

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
