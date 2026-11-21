/* Service worker da Calculadora de Juros (PWA).
   - Guarda a página e os ícones para abrir mesmo sem rede.
   - Só trata pedidos do mesmo site: anúncios (AdSense) e outros domínios passam sempre pela rede, sem interferência.
   - Para forçar a atualização depois de alterar a página, mude o número da versão abaixo. */
var VERSAO = 'calculadora-juros-v3';
var FICHEIROS = [
    './',
    './index.html',
    './manifest.json',
    './favicon-64.png',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-192.png',
    './icon-maskable-512.png',
    './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
    /* Guarda cada ficheiro à parte: se algum faltar no site, os outros ficam guardados na mesma */
    e.waitUntil(caches.open(VERSAO).then(function (c) {
        return Promise.all(FICHEIROS.map(function (f) { return c.add(f).catch(function () { /* ignora */ }); }));
    }));
    self.skipWaiting();
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (nomes) {
            return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    var req = e.request, url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== self.location.origin) return;   /* anúncios e outros domínios: não mexer */

    if (req.mode === 'navigate') {
        /* Página: tenta a rede (para ter sempre a versão mais recente) e usa a cópia guardada se estiver sem ligação */
        e.respondWith(
            fetch(req).then(function (resp) {
                var copia = resp.clone();
                caches.open(VERSAO).then(function (c) { c.put('./',
    './index.html', copia); });
                return resp;
            }).catch(function () { return caches.match('./index.html'); })
        );
        return;
    }
    /* Restantes ficheiros do site: cópia guardada primeiro, rede como alternativa */
    e.respondWith(
        caches.match(req).then(function (guardado) {
            return guardado || fetch(req).then(function (resp) {
                var copia = resp.clone();
                caches.open(VERSAO).then(function (c) { c.put(req, copia); });
                return resp;
            });
        })
    );
});
