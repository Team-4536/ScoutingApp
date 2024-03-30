"use strict";

var rqId = 1;

var pendingRequests = {};

const rqTimeout = (rqId) => {
    console.warn(`request ${rqId} timed out`, pendingRequests[rqId]);
    delete pendingRequests[rqId];
}

const call = async (method, ...args) => {
    let rq = {
        requestId: ++rqId,
        method: method,
        args: args
    }

    await navigator.serviceWorker.ready
    navigator.serviceWorker.controller.postMessage(rq);
    return new Promise((resolve, reject) => {
        pendingRequests[rqId] = {
            request: rq,
            resolve: resolve,
            reject: reject,
            timer: setTimeout(rqTimeout, 1000, rqId),
        };
    });
}

navigator.serviceWorker.addEventListener("message", (m) => {
    let reply = m.data.reply;
    let rq = pendingRequests[reply.requestId];
    if (!rq) {
        console.log(`message ${m}`, `received unexpected reply for ${reply.requestId}`);
    } else {
        rq.resolve(reply.result);
        clearTimeout(rq.timer);
        delete pendingRequests[reply.requestId];
    }
});

class DBClient {
    constructor() {
    }

    async putMatch(data) {
        return call("db.putMatch", data);
    }

    async deleteTeam(team) {
        return call("db.deleteTeam", team);
    }

    async getMatch(comp, round, team) {
        return call("db.getMatch", comp, round, team);
    }

    async getMatches(comp, round) {
        return call("db.getMatches", comp, round);
    }

    async getMatchKeys(comp, round) {
        return call("db.getMatchKeys", comp, round);
    }
}

class CacheClient {
}

export { DBClient };
export { CacheClient };