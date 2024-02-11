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

    async putTeam(team) {
        return call("db.putTeam", team);
    }

    async deleteTeam(team) {
        return call("db.deleteTeam", team);
    }

    async getTeam(team) {
        return call("db.getTeam", team);
    }

    async getAllTeams() {
        return call("db.getAllTeams");
    }

    async getAllTeamNumbers() {
        return call("db.getAllTeamNumbers");
    }
}

class CacheClient {
}

export { DBClient };
export { CacheClient };
