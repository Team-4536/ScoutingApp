"use strict";

import validTeam from './scripts/script.js'

class CacheController extends EventTarget {
    constructor() {
        super();
        this.cache = null;
        globalThis.caches.open("v1").then((c) => this.cache = c);
    }
    refresh() {
        console.log("cache refresh");
        if (this.cache()) {
            //
        }
    }
    async fetch(request) {
        console.log(`fetch ${request.url}`)
        let cached = await this.cache.match(request, { ignoreSearch: true });
        console.log("in cache", cached);
        if (!cached || navigator.onLine) {
            console.log("caching");
            let f = globalThis.fetch(request, { cache: "no-store" });
            return f.then((r) => {
                console.log("resp", r);
                let z = r.clone();
                this.cache.put(request, r);
                return z;
            }).catch(e => {
                console.log("fail", e);
                if (cached) {
                    return cached;
                }
            });
        } else {
            console.log("returning cached");
            return cached.clone();
        }
    }
}

class DBController extends EventTarget {
    constructor(dbName, version=1) {
        super();
        this.dbrq = indexedDB.open(dbName, version);
        this.dbrq.addEventListener("success", this.openSuccess.bind(this));
        this.dbrq.addEventListener("error", this.openError.bind(this));
        this.dbrq.addEventListener("upgradeneeded", this.upgrade.bind(this));
    }

    openSuccess(event) {
        console.log("db opened");
        this.db = event.target.result;
    }

    openError(event) {
    }

    upgrade(event) {
        console.log("initializing/upgrading");
        let db = event.target.result;
        db.createObjectStore("team", { keyPath: "team" });
    };

    teamRead(reader) {
        const tx = this.db.transaction("team");
        const store = tx.objectStore("team");
        const rq = reader(store);
        return new Promise((r) => {
            rq.onsuccess = (e) => {
                r(e.target.result);
            };
        });
    }

    async putTeam(team) {
        if (validTeam(team)) {
            const tx = this.db.transaction("team", "readwrite");
            const store = tx.objectStore("team");
            const rq = store.put(team);
            let p = new Promise((r) => {
                rq.onsuccess = (e) => {
                    r(e.target.result)
                };
            });
        }
    }

    async deleteTeam(team) {
        const tx = this.db.transaction("team", "readwrite");
        const store = tx.objectStore("team");
        const rq = store.delete(team);
        let p = new Promise((r) => {
            rq.onsuccess = (e) => {
                r(e.target.result)
            };
        });
    }

    getTeam(team) {
        return this.teamRead((store) => { return store.get(team); });
    }

    getAllTeams() {
        return this.teamRead((store) => { return store.getAll(); });
    }

    getAllTeamNumbers() {
        return this.teamRead((store) => { return store.getAllKeys(); });
    }
}

class App {
    constructor() {
        this.cacheController = new CacheController();
        this.dbController = new DBController("scouting");

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
        let rq = event.data;
        if (typeof rq !== "object") {
            console.log("received badly formatted message (not object)");
            return;
        }
        let { requestId, method, args } = rq;
        let [controller, cmd] = method.split(".");

        let ctlr = Reflect.get(this, `${controller}Controller`);
        if (!ctlr) {
            console.log(`controller ${controller}Controller not found`);
            return;
        }
        let target = Reflect.get(ctlr, cmd);
        let caller = event.source.id;
        if (!target) {
            console.log(`method ${cmd} not found`);
            return;
        }
        try {
            target.call(ctlr, ...args).then((result) => {
                globalThis.clients.get(caller).then((client) => {
                    client.postMessage({
                        reply: {
                            requestId: requestId,
                            result: result
                        }
                    });
                });
            });
        } catch (e) {
            console.log(e);
        }
    }
}

const app = new App();
