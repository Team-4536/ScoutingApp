"mode strict";

var cache = caches.open("v9");

const addResourcesToCache = async (resources) => {
    cache.then(c => c.addAll(resources))
};

self.addEventListener("install", (event) => {
    event.waitUntil(
		addResourcesToCache([
			"./",
			"./index.html",
			"./qrcode.js",
			"./minutebots-logo.png",
			"./minutebots-logo.ico"
		]).then(() => {
			skipWaiting();
		})
    );
    // console.log('installed', new Data());
    return event
});

self.addEventListener("activate", (event) => {
    // console.log('activated', new Data());
    clients.claim();
    return event
});


self.addEventListener("fetch", (event) => {
    // console.log(event.request.url);
    event.respondWith(
		(async () => {
			let c = await cache;
			let r = await c.match(event.request);
			if (r) {
			// console.log("found in cache");
			// console.log(r);
			return r;
			} else {
			// console.log("fetch", event.request, "not cached");
			return fetch(event.request);
			}
		})()
    )
});
