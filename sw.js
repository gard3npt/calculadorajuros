/* Service worker: permite instalar a app e abri-la sem rede.
   Quando alterar o index.html, mude o número da versão abaixo para os telemóveis atualizarem. */
var VERSAO = 'calc-juros-v4';
var FICHEIROS = [
    './', 'index.html', 'manifest.json',
    'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
    'apple-touch-icon.png', 'favicon-64.png'
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
    /* rede primeiro (ficheiros sempre atualizados); sem rede, usa a cópia guardada */
    e.respondWith(
        fetch(req).then(function (r) {
            if (r && r.ok) {
                var copia = r.clone();
                caches.open(VERSAO).then(function (c) { c.put(req.mode === 'navigate' ? 'index.html' : req, copia); });
            }
            return r;
        }).catch(function () {
            return caches.match(req).then(function (r) { return r || (req.mode === 'navigate' ? caches.match('index.html') : undefined); });
        })
    );
});
