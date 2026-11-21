/* Service worker: permite instalar a app e abri-la sem rede.
   Quando alterar o index.html, mude o número da versão abaixo para os telemóveis atualizarem. */
var VERSAO = 'calc-juros-v2';
var FICHEIROS = [
    './', 'index.html', 'manifest.json',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
    'icons/apple-touch-icon.png', 'icons/favicon-64.png'
];

self.addEventListener('install', function (e) {
    /* guarda um a um: se faltar algum ficheiro, o service worker instala-se na mesma */
    e.waitUntil(caches.open(VERSAO).then(function (c) {
        return Promise.all(FICHEIROS.map(function (f) { return c.add(f).catch(function () { /* ignora */ }); }));
    }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (nomes) {
            return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    if (req.mode === 'navigate') {
        /* página: tenta a rede (versão mais recente) e, sem rede, usa a guardada */
        e.respondWith(
            fetch(req).then(function (r) {
                var copia = r.clone();
                caches.open(VERSAO).then(function (c) { c.put('index.html', copia); });
                return r;
            }).catch(function () { return caches.match('index.html'); })
        );
        return;
    }
    e.respondWith(caches.match(req).then(function (r) { return r || fetch(req); }));
});
