// Nome do cache
const CACHE_NAME = 'percepcao-musical-cache-v1';

// Arquivos a serem armazenados em cache
const urlsToCache = [
  '/',
  '/index.html',
  '/_expo/static/js/web/entry-9a744f11a2399f0feaea0460ef978a30.js',
  '/manifest.json',
  // Adicionar outras URLs conforme necessário
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptação de solicitações
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna a resposta do cache
        if (response) {
          return response;
        }

        // Clonar a solicitação porque ela só pode ser consumida uma vez
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Verificar se obtivemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar a resposta porque ela só pode ser consumida uma vez
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Adicionar resposta ao cache
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Atualização do Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Remover caches antigos
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 