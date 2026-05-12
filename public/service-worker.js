const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const NAVIGATION_CACHE = `navigation-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PDFJS_CACHE = `pdfjs-${CACHE_VERSION}`;

const APP_SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/apple-icon",
  "/leyendo-logo.svg",
];

const ACTIVE_CACHES = new Set([
  APP_SHELL_CACHE,
  NAVIGATION_CACHE,
  STATIC_CACHE,
  PDFJS_CACHE,
]);

function isAppRouterDataRequest(request, url) {
  return (
    request.headers.has("RSC") ||
    request.headers.has("Next-Router-State-Tree") ||
    url.searchParams.has("_rsc")
  );
}

function isPdfJsAsset(url) {
  return url.pathname.startsWith("/pdfjs/");
}

function isStaticAsset(request, url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    ["font", "image", "script", "style", "worker"].includes(
      request.destination,
    )
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    void networkPromise;
    return cachedResponse;
  }

  const response = await networkPromise;

  if (response) {
    return response;
  }

  return Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(NAVIGATION_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const shellResponse = await caches.match("/");

    if (shellResponse) {
      return shellResponse;
    }

    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();

      await Promise.all(
        cacheKeys
          .filter((cacheKey) => !ACTIVE_CACHES.has(cacheKey))
          .map((cacheKey) => caches.delete(cacheKey)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || isAppRouterDataRequest(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isPdfJsAsset(url)) {
    event.respondWith(cacheFirst(request, PDFJS_CACHE));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});