"use strict";

var rqId = 1;

var pendingRequests = {};

const rqTimeout = (rqId) => {
    console.warn(`request ${rqId} timed out`);
    delete pendingRequests[rqId];
}

const call = (method, ...args) => {
    let rq = {
        requestId: ++rqId,
        method: method,
        args: args
    }

    navigator.serviceWorker.controller.postMessage(rq);
    return new Promise((resolve, reject) => {
        pendingRequests[rqId] = {
            resolve: resolve,
            reject: reject,
            timer: setTimeout(rqTimeout, 1000, rqId)
        };
    });
}

navigator.serviceWorker.addEventListener("message", (m) => {
    let reply = m.data.reply;
    let rq = pendingRequests[reply.requestId];
    if (!rq) {
        console.log(`received unexpected reply for ${reply.requestid}`);
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
        return call("db.getAllMatches", comp, round);
    }

    async getMatchKeys(comp, round) {
        return call("db.getMatchKeys", comp, round);
    }
}

class CacheClient {
}

export { DBClient };
export { CacheClient };
