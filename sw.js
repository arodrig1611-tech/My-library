const CACHE_NAME = 'img-cache-v1';

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('imgchest.com')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    return response || fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
});
