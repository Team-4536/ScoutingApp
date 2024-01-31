var rqId = 1;

var pendingRequests = {};

const call = (method, ...args) => {
    let rq = {
	requestId: ++rqId,
	method: method,
	args: args
    }

    navigator.serviceWorker.controller.postMessage(rq);
    return new Promise((resolve) => {
	pendingRequests[rqId] = resolve;
    });
}

navigator.serviceWorker.addEventListener("message", (m) => {
    let reply = m.data.reply;
    let resolver = pendingRequests[reply.requestId];
    resolver(reply.result);
});

class DBClient {
    constructor() {
    }

    async saveTeam(team) {
	return call("db.saveTeam", team);
    }

    async getTeam(team) {
	return call("db.getTeam", team);
    }

    async getAllTeams() {
	return [];
    }

    async getAllTeamNumbers() {
	return [];
    }
}

class CacheClient {
}

export { DBClient };
export { CacheClient };
