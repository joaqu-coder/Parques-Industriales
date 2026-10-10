// Service worker de EGPAIS — Cartas de Intención.
//
// Subí VERSION en cada deploy que cambie archivos de public/. El nombre de la
// caché depende de ella, así que un cambio de VERSION descarta la anterior.
// Antes el nombre era fijo ("...-v1"), nunca se borraban cachés viejas y la
// estrategia era cache-first para todo: después de un deploy el usuario veía
// el HTML viejo hasta la SEGUNDA recarga.
const VERSION = "v3";
const CACHE = "egpais-cartas-intencion-" + VERSION;

// Lo mínimo para que la app abra sin red la primera vez.
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/favicon-32.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(cache){ return cache.addAll(SHELL); })
      .catch(function(){ /* sin red en la instalación: no bloquea */ })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(nombres){
      return Promise.all(nombres.map(function(n){
        // Borra toda caché de esta app que no sea la versión actual.
        if(n !== CACHE && n.indexOf("egpais-cartas-intencion-") === 0){
          return caches.delete(n);
        }
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  var url = new URL(req.url);

  // NO TOCAR: la sincronización nunca se cachea. Si sacás este if, la sync
  // "parece" rota sin estarlo. (Trampa 4 del README.)
  if(url.pathname.startsWith("/api/")) return;

  // La Cache API solo admite GET: un cache.put de un POST rechaza y rompería
  // la respuesta entera.
  if(req.method !== "GET") return;

  // Nada de otros orígenes.
  if(url.origin !== self.location.origin) return;

  // Navegación (el HTML): red primero, caché como respaldo. Así un deploy se
  // ve en la primera recarga y offline sigue funcionando.
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(resp){
        if(resp && resp.ok){
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match("/");
        });
      })
    );
    return;
  }

  // Estáticos (iconos, manifest): caché primero y refresco en segundo plano.
  e.respondWith(
    caches.open(CACHE).then(function(cache){
      return cache.match(req).then(function(cached){
        var red = fetch(req).then(function(resp){
          if(resp && resp.ok) cache.put(req, resp.clone());
          return resp;
        }).catch(function(){ return cached; });
        return cached || red;
      });
    })
  );
});
