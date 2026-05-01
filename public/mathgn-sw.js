// Service worker for offline gn-math access.
// Caches /gn-math.html so once the user has opened the page online,
// it works at school even with the network blocked.
const CACHE = "gnmath-v1";
const FILES = ["/gn-math.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Only intercept gn-math.html — leave the rest of the app alone.
  if (url.pathname === "/gn-math.html" || url.pathname === "/mathgn") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // refresh cache silently
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/gn-math.html", copy));
          return res;
        })
        .catch(() => caches.match("/gn-math.html").then((r) => r || new Response("Offline and no cache yet.", { status: 503 })))
    );
  }
});
