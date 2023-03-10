/*
The village crows own an old scalpel that they occasionally
use on special missions—say, to cut through screen doors or packaging.
To be able to quickly track it down, every time the scalpel is moved
to another nest, an entry is added to the storage of both the nest that
had it and the nest that took it, under the name "scalpel",
with its new location as the value.

This means that finding the scalpel is a matter of
following the breadcrumb trail of storage entries,
until you find a nest where that points at the nest itself.

Write an async function locateScalpel that does this,
starting at the nest on which it runs.
You can use the anyStorage function defined earlier to access
storage in arbitrary nests. The scalpel has been going around
long enough that you may assume that every nest has a "scalpel"
entry in its data storage.

Next, write the same function again without using async and await.

Do request failures properly show up as rejections of the
returned promise in both versions? How?
 */
"use strict";
let bigOak = require("./crow-tech").bigOak;
let defineRequestType = require("./crow-tech").defineRequestType;

defineRequestType("note", (nest, content, source, done) => {
    console.log(`${nest.name} received note: ${content}`);
    done();
});
function storage(nest, name) {
    return new Promise(resolve => {
        nest.readStorage(name, result => resolve(result));
    });
}
let Timeout = class Timeout extends Error {}

function request(nest, target, type, content) {
    return new Promise((resolve, reject) => {
        let done = false;
        function attempt(n) {
            nest.send(target, type, content, (failed, value) => {
                done = true;
                if (failed) reject(failed);
                else resolve(value);
            });
            setTimeout(() => {
                if (done) return;
                else if (n < 3) attempt(n + 1);
                else reject(new Timeout("Timed out"));
            }, 250);
        }
        attempt(1);
    });
}
function requestType(name, handler) {
    defineRequestType(name, (nest, content, source, callback) => {
        try {
            Promise.resolve(handler(nest, content, source))
                .then(response => callback(null, response),
                    failure => callback(failure));
        } catch (exception) {
            callback(exception);
        }
    });
}
requestType("ping", () => "pong");

function availableNeighbors(nest) {
    let requests = nest.neighbors.map(neighbor => {
        return request(nest, neighbor, "ping")
            .then(() => true, () => false);
    });
    return Promise.all(requests).then(result => {
        return nest.neighbors.filter((_, i) => result[i]);
    });
}

let everywhere = require("./crow-tech").everywhere;

everywhere(nest => {
    nest.state.gossip = [];
});

function sendGossip(nest, message, exceptFor = null) {
    nest.state.gossip.push(message);
    for (let neighbor of nest.neighbors) {
        if (neighbor == exceptFor) continue;
        request(nest, neighbor, "gossip", message);
    }
}

requestType("gossip", (nest, message, source) => {
    if (nest.state.gossip.includes(message)) return;
    console.log(`${nest.name} received gossip '${
        message}' from ${source}`);
    sendGossip(nest, message, source);
});

requestType("connections", (nest, {name, neighbors},
                            source) => {
    let connections = nest.state.connections;
    if (JSON.stringify(connections.get(name)) ===
        JSON.stringify(neighbors)) return;
    connections.set(name, neighbors);
    broadcastConnections(nest, name, source);
});

function broadcastConnections(nest, name, exceptFor = null) {
    for (let neighbor of nest.neighbors) {
        if (neighbor == exceptFor) continue;
        request(nest, neighbor, "connections", {
            name,
            neighbors: nest.state.connections.get(name)
        });
    }
}

everywhere(nest => {
    nest.state.connections = new Map();
    nest.state.connections.set(nest.name, nest.neighbors);
    broadcastConnections(nest, nest.name);
});

function findRoute(from, to, connections) {
    let work = [{at: from, via: null}];
    for (let i = 0; i < work.length; i++) {
        let {at, via} = work[i];
        for (let next of connections.get(at) || []) {
            if (next === to) return via;
            if (!work.some(w => w.at === next)) {
                work.push({at: next, via: via || next});
            }
        }
    }
    return null;
}

function routeRequest(nest, target, type, content) {
    if (nest.neighbors.includes(target)) {
        return request(nest, target, type, content);
    } else {
        let via = findRoute(nest.name, target,
            nest.state.connections);
        if (!via) throw new Error(`No route to ${target}`);
        return request(nest, via, "route",
            {target, type, content});
    }
}

requestType("route", (nest, {target, type, content}) => {
    return routeRequest(nest, target, type, content);
});
//
requestType("storage", (nest, name) => storage(nest, name));

function anyStorage(nest, source, name) {
    if (source === nest.name) return storage(nest, name);
    else return routeRequest(nest, source, "storage", name);
}


async function locateScalpel(nest) {
    let current = nest.name;
    for (;;){
        let secondNest = await anyStorage(nest,current,"scalpel")
        if (secondNest === current) return current;
        current = secondNest;
    }

}
function locateScalpel2(nest) {
    return new Promise(resolve => {
        let current = nest.name;
        function find(current) {
            new Promise(resolve => {
                resolve(anyStorage(nest, current, "scalpel"));
            }).then(result => {
                if (result === current) resolve(current);
                else find(result);
            });
        }
       find(current);
    });
}
locateScalpel2(bigOak).then(console.log);
// → Butcher Shop
