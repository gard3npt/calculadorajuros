/* Service worker da Calculadora de Juros (PWA).
   - Guarda a página e os ícones para abrir mesmo sem rede.
   - Só trata pedidos do mesmo site: anúncios (AdSense) e outros domínios passam sempre pela rede, sem interferência.
   - Atualiza sozinho: basta substituir o index.html no site (não é preciso mexer neste ficheiro). */
var VERSAO = 'calculadora-juros-v5';
var FICHEIROS = [
    './',
    './index.html',
    './manifest.json',
    './icons/favicon-64.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-192.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
    /* Guarda cada ficheiro à parte: se algum faltar no site, os outros ficam guardados na mesma */
    e.waitUntil(caches.open(VERSAO).then(function (c) {
        return Promise.all(FICHEIROS.map(function (f) {
            return fetch(f, { cache: 'reload' }).then(function (resp) {
                if (resp.ok) return c.put(f, resp);
            }).catch(function () { /* ignora */ });
        }));
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

function guardar(chave, resp) {
    if (resp && resp.ok) {
        var copia = resp.clone();
        caches.open(VERSAO).then(function (c) { c.put(chave, copia); });
    }
    return resp;
}

self.addEventListener('fetch', function (e) {
    var req = e.request, url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== self.location.origin) return;   /* anúncios e outros domínios: não mexer */

    /* Página e manifest: rede primeiro (ignora a cache do GitHub Pages); sem ligação usa a cópia guardada */
    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req.url, { cache: 'no-cache' }).then(function (resp) {
                return guardar('./index.html', resp);
            }).catch(function () { return caches.match('./index.html'); })
        );
        return;
    }
    if (/manifest\.json$/.test(url.pathname)) {
        e.respondWith(
            fetch(req.url, { cache: 'no-cache' }).then(function (resp) {
                return guardar(req, resp);
            }).catch(function () { return caches.match(req); })
        );
        return;
    }

    /* Restantes ficheiros: mostra a cópia guardada já e atualiza-a em segundo plano */
    e.respondWith(
        caches.match(req).then(function (guardado) {
            var rede = fetch(req.url, { cache: 'no-cache' }).then(function (resp) {
                return guardar(req, resp);
            }).catch(function () { return guardado; });
            return guardado || rede;
        })
    );
});
