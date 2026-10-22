/* Bodyking FC — app web (PWA)
   - La página: primero internet (siempre la última versión); si tarda más de 4 s o no hay cobertura, la guardada.
   - Iconos, librería del PDF y letras: guardados en el móvil.
   - Firebase y la IA no pasan por aquí (siempre en directo). */
const CACHE = 'bodyking-app-v1';
const NUCLEO = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const EXTERNOS = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(NUCLEO);
    await Promise.all(EXTERNOS.map(u => c.add(u).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bodyking-app-') && k !== CACHE).map(k => caches.delete(k)))) // solo lo de esta app: el visor y otras webs de github.io comparten almacén
    .then(() => self.clients.claim()));
});

const guardable = url => url.origin === self.location.origin || url.hostname === 'cdnjs.cloudflare.com'
  || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!guardable(url)) return;

  if (req.mode === 'navigate') {
    // Internet con 4 s de margen (cobertura mala en el campo); si no llega, la copia guardada
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const red = fetch(req, { cache: 'no-cache' }).then(r => { if (r && r.ok) c.put('./index.html', r.clone()).catch(() => {}); return r; });
      red.catch(() => {});
      const plazo = new Promise(ok => setTimeout(() => ok(null), 4000));
      const primero = await Promise.race([red.catch(() => null), plazo]);
      if (primero) return primero;
      const guardada = await c.match('./index.html');
      return guardada || red;
    })());
    return;
  }

  e.respondWith(caches.match(req).then(enCache => {
    const deRed = fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return r;
    }).catch(() => enCache);
    return enCache || deRed;
  }));
});
