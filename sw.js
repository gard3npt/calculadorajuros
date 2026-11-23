/* Service worker da Calculadora de Juros (Mobile).
   Atualiza sozinho: basta substituir o index.html no site (não é preciso mexer neste ficheiro).
   - Página (index.html): rede primeiro, para veres sempre a versão mais recente; sem ligação usa a cópia guardada.
   - Ícones e restantes ficheiros do site: mostra a cópia guardada e atualiza-a em segundo plano.
   - Anúncios (AdSense) e outros endereços externos passam direto, sem serem guardados.
   - Pedidos «sem cache» (botão Atualizar, diagnóstico) vão sempre à rede. */
const CACHE_VERSION = 'v5';
const CACHE_NAME = 'calculadora-juros-' + CACHE_VERSION;
const PRECACHE = [
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

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            /* Um ficheiro em falta não deve impedir a instalação do service worker */
            .then((cache) => Promise.all(PRECACHE.map((f) => cache.add(f).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k.startsWith('calculadora-juros-') && k !== CACHE_NAME)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    /* Só trata pedidos do próprio site: AdSense e outros domínios seguem direto para a rede */
    if (url.origin !== self.location.origin) return;
    /* Pedidos «sem cache» vão sempre à rede */
    if (req.cache === 'reload' || req.cache === 'no-store') return;

    /* Página: tenta a rede primeiro e usa a cópia guardada sem ligação */
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req.url, { cache: 'no-cache' })
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
                    }
                    return res;
                })
                .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
        );
        return;
    }

    /* Restantes ficheiros: responde da cópia guardada e atualiza em segundo plano */
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req.url, { cache: 'no-cache' })
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
