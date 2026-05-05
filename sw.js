const CACHE_NAME = “taktiktavla-v1”;
const urlsToCache = [”/”];

self.addEventListener(“install”, function(event) {
event.waitUntil(
caches.open(CACHE_NAME).then(function(cache) {
return cache.addAll(urlsToCache);
})
);
self.skipWaiting();
});

self.addEventListener(“activate”, function(event) {
event.waitUntil(
caches.keys().then(function(keys) {
return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
})
);
self.clients.claim();
});

self.addEventListener(“fetch”, function(event) {
// Only cache same-origin requests (not Supabase API)
if(event.request.url.indexOf(“supabase.co”) !== -1) return;
event.respondWith(
caches.match(event.request).then(function(response) {
if(response) return response;
return fetch(event.request).then(function(networkResponse) {
if(networkResponse && networkResponse.status === 200 && networkResponse.type === “basic”) {
var responseToCache = networkResponse.clone();
caches.open(CACHE_NAME).then(function(cache) {
cache.put(event.request, responseToCache);
});
}
return networkResponse;
}).catch(function() {
return caches.match(”/”);
});
})
);
});