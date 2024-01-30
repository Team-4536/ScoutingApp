"mode strict";

class CacheController {
    constructor() {
        this.cache = null
        globalThis.caches.open("v1").then((c) => this.cache = c);
    }
    refresh() {
        console.log("cache refresh");
        if (this.cache()) {
            //
        }
    }
    async fetch(request) {
        let cached = await this.cache.match(request, { ignoreSearch: true });
        console.log("in cache", cached);
        if (!cached || navigator.onLine) {
            console.log("caching");
            let f = globalThis.fetch(request);
            return f.then((r) => {
                let z = r.clone();
                this.cache.put(request, r);
                return z;
            });
        } else {
            console.log("returning cached");
            return cached.clone();
        }
    }
}

class DBController {
    constructor() {
    }
}

class App {
    constructor() {
        this.cacheController = new CacheController();
        this.dbController = new DBController();

        globalThis.addEventListener("message", this.message.bind(this));
        globalThis.addEventListener("install", this.install.bind(this));
        globalThis.addEventListener("activate", this.activate.bind(this));
        globalThis.addEventListener("fetch", this.fetch.bind(this));
    }

    install(event) {
        console.log("install");
        globalThis.skipWaiting();
    }

    activate(event) {
        console.log("activate");
        globalThis.clients.claim();
    }

    fetch(event) {
        console.log("fetch");
        event.respondWith(this.cacheController.fetch(event.request));
    }

    message(event) {
        console.log("got message", event);
        let args = event.data;
        if (!Array.isArray(args)) {
            console.log("received badly formatted message (not array)");
            return;
        }
        if (args.length == 0) {
            console.log("received badly formatted message (empty)");
            return;
        }
        let c = args[0];
        args.shift();
        if (typeof c != "string") {
            console.log("received badly formatted message (command must be a string)");
            return;
        }
        let s = c.split(".");
        if (s.length != 2) {
            console.log("received badly formatted message (command must be of the form controller.method)");
            return;
        }
        let controller = s[0];
        let cmd = s[1];

        let ctlr = Reflect.get(this, `${controller}Controller`);
        if (!ctlr) {
            console.log(`controller ${controller}Controller not found`);
            return;
        }
        let method = Reflect.get(ctlr, cmd);
        if (!method) {
            console.log(`method ${cmd} not found`);
            return;
        }
        try {
            method.apply(ctlr, args);
        } catch (e) {
            console.log(e);
        }
    }
}

app = new App();
