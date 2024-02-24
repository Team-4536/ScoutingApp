"use strict";

const DB_NAME = "scouting";
const OBJECT_STORE = "team";

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

    async upgrade(event) {
        console.log("initializing/upgrading");
        let db = event.target.result;
        switch (event.newVersion) {
        case 1:
            db.createObjectStore(OBJECT_STORE, { keyPath: "team" });
        default:
            try {
                db.deleteObjectStore(OBJECT_STORE);
            } catch {
            }
            let store = db.createObjectStore(OBJECT_STORE, {
                keyPath: [ "team", "comp", "round" ]
            });
            try {
                store.createIndex("byComp", ["comp", "team", "round"]);
            } catch (e) {
                console.log(e);
            }
            try {
                store.createIndex("byCompRound", ["comp", "round", "team"]);
            } catch (e) {
                console.log(e);
            }
        }
    };

    teamRead(reader) {
        const tx = this.db.transaction(OBJECT_STORE);
        const store = tx.objectStore(OBJECT_STORE);
        const rq = reader(store);
        return new Promise((r) => {
            rq.onsuccess = (e) => {
                r(e.target.result);
            };
        });
    }

    async putMatch(team) {
        const tx = this.db.transaction(OBJECT_STORE, "readwrite");
        const store = tx.objectStore(OBJECT_STORE);
        const rq = store.put(team);
        let p = new Promise((r) => {
            rq.onsuccess = (e) => {
                r(e.target.result)
            };
        });
    }

    async deleteTeam(team) {
        const tx = this.db.transaction(OBJECT_STORE, "readwrite");
        const store = tx.objectStore(OBJECT_STORE);
        const rq = store.delete(team);
        let p = new Promise((r) => {
            rq.onsuccess = (e) => {
                r(e.target.result)
            };
        });
    }

    getMatch(comp, round, team) {
        return this.teamRead((store) => {
            return store.get([team, comp, round]);
        });
    }

    getMatches(comp=null, round=null) {
        const tx = this.db.transaction(OBJECT_STORE);
        const store = tx.objectStore(OBJECT_STORE);
        const idx = store.index("byCompRound");
        //let rq = idx.openKeyCursor(
        let rq;
        if (comp) {
            const lower = [comp, round ? round : "", ""];
            const upper = [comp, round ? round : "99", "9999999"];
            rq = idx.getAll(IDBKeyRange.bound(lower, upper));
        } else {
            rq = idx.getAll();
        };

        let p = new Promise((r) => {
            console.log('rq = ', rq);
            rq.onerror = (e) => {
                console.log('error', e);
            }
            rq.onsuccess = (e) => {
                r(e.target.result);
            }
        });

        return p;
    }

    getMatchKeys(comp=null, round=null) {
    }

    getMatchKeysForMatch(comp, round) {
        const tx = this.db.transaction(OBJECT_STORE);
        const store = tx.objectStore(OBJECT_STORE);
        const idx = store.index("byCompRound");
        //let rq = idx.openKeyCursor(
        let rq = idx.getAllKeys(
            IDBKeyRange.bound([comp, round, ""],
                              [comp, round, "99999999"])
        );

        let p = new Promise((r) => {
            console.log('rq = ', rq);
            rq.onerror = (e) => {
                console.log('error', e);
            }
            rq.onsuccess = (e) => {
                r(e.target.result);
            }
        });

        return p;
    }
}

class App {
    constructor() {
        this.cacheController = new CacheController();
        this.dbController = new DBController(DB_NAME, 16);

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
