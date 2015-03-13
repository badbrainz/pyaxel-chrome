(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var storage = messagebus.query('storage');

var queue = utils.opqueue(60000, storage.WRITE_OPERATIONS_PER_MINUTE);

function debug() {
    if (chrome.runtime.lastError)
        console.warn('[%s] %s', utils.time(), chrome.runtime.lastError.message);
}

function sanitize(a) {
    if (a == null) return '';
    return JSON.stringify(a).replace(/[\u0000-\u001F\u0080-\uFFFF\u007F\u003C\u003E]/g, function(c) {
        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
}

function set(c) {
    queue.put(function() {
        storage.local.get(Object.keys(c), function(o) {
            var d = {};
            for (var k in o) {
                if (k.length + sanitize(o[k]).length > storage.QUOTA_BYTES_PER_ITEM) {
                    console.warn('[%s] can\'t sync %s: item too large', utils.time(), k);
                    continue;
                }
                d[k] = o[k];
            }
            storage.remote.set(d, debug);
        });
    });
}

function remove(c) {
    queue.put(function() {
        storage.local.get(c, function(o) {
            var d = [];
            for (var i = 0; i < c.length; i++) {
                if (!(c[i] in o))
                    d.push(c[i]);
            }
            storage.remote.remove(d, debug);
        });
    });
}

function filterChanges(o) {
    var data = {};
    for (var k in o)
        data[k] = o[k].newValue;
    return data;
}

function updateAccount(o) {
    if (Object.keys(o).length)
        messagebus.broadcast('sync-data', o);
}

function sendChanges(o) {
    if (Object.keys(o.added).length)
        set(o.added);
    if (o.removed.length)
        remove(o.removed);
}

function retreiveChanges(o) {
    storage.remote.get(o, updateAccount);
}

var api = {
    pull: function(data) {
        var k = data;
        switch (utils.type(k)) {
            case 'object':
                k = Object.keys(data);
            case 'string':
            case 'array':
            case 'undefined':
                retreiveChanges(k);
                break;
        }
    },

    push: function(data) {
        sendChanges({ added: data, removed: [] });
    },

    merge: function(changes) {
        var o = filterChanges(changes);
        updateAccount(o);
    }
};

messagebus.add({
    'name': 'sync',
    'interface': function() {
        return utils.merge({}, api);
    },
    'change-settings': function(diff) {
        sendChanges(diff);
    }
});

})(global.extension);
