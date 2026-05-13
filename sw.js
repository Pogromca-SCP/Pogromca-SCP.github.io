// @ts-check

const SCOPE = "https://pogromca-scp.github.io";
const CACHE_PREFIX = "aspwa_"
const CACHE_NAME = `${CACHE_PREFIX}v1`;

/** @type {readonly string[]} */
const urls = [
  `${SCOPE}/`,
  `${SCOPE}/index.html`,
  `${SCOPE}/style.css`,
  `${SCOPE}/app.js`,
  `${SCOPE}/logo.png`,
  `${SCOPE}/canvas-expr/canvas-expr.html`,
  `${SCOPE}/canvas-expr/canvas-expr.png`,
  `${SCOPE}/canvas-expr/style.css`,
  `${SCOPE}/canvas-expr/js/compiler.js`,
  `${SCOPE}/canvas-expr/js/debug.js`,
  `${SCOPE}/canvas-expr/js/enums.js`,
  `${SCOPE}/canvas-expr/js/main.js`,
  `${SCOPE}/canvas-expr/js/scanner.js`,
  `${SCOPE}/canvas-expr/js/std-lib.js`,
];

self.addEventListener("fetch", e => e.respondWith(async () => {
  const response = await caches.match(e.request);

  if (response) {
    return response;
  }

  return fetch(e.request);
}));

self.addEventListener("install", e => e.waitUntil(async () => {
  const cache = await caches.open(CACHE_NAME);
  cache.addAll(urls);
}));

self.addEventListener("activate", e => e.waitUntil(async () => {
  const keys = await caches.keys();
  const whitelist = keys.filter(key => key.indexOf(CACHE_PREFIX));
  whitelist.push(CACHE_NAME);

  return Promise.all(keys.map(key => {
    if (whitelist.indexOf(key) === -1) {
      return caches.delete(key);
    }
  }));
}));