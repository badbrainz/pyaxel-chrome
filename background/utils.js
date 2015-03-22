ext.define('extension.utils', function() {

var rxmeta = /([.*:;'"!@#$%^&?\-+=<>\\\/~`|(){}\[\]])/g;
var rxmetachars = /(\\[bcdfnrtvsw])/ig;
var rxhost = /^(?:[^@]+@)?([0-9a-z.-]+)(?::\d*)?$/i;
var regx = /^\/.*\/$/;
// http://tools.ietf.org/html/rfc3986#appendix-B
var rxuri = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

function escapeMetachars(s) {
    return s.replace(rxmeta, '\\$1').replace(rxmetachars, '\\\\$1');
}

function expandWildcards(s) {
    return regx.test(s) ? s.substr(1, s.length - 2) : (s.indexOf('*') != -1 ?
        s.split('*').map(escapeMetachars).join('(.*?)') : escapeMetachars(s));
}

var Event = {
    addListener: function(l) {
        this.removeListener(l);
        this.listeners.push(l);
    },
    removeListener: function(l) {
        var i = this.listeners.indexOf(l);
        if (i != -1) this.listeners.splice(i, 1);
    },
    fire: function() {
        while (this.listeners.length)
            this.listeners.shift()();
        this.addListener = echoFunction();
    }
};

var Timer = {
    start: function() {
        if (!this.enabled) {
            this.timestamp = Date.now();
            this.enabled = true;
            this.id = window.setInterval(this.callback, this.interval);
        }
    },
    stop: function() {
        if (this.enabled) {
            window.clearInterval(this.id);
            delete this.timestamp;
            delete this.enabled;
            delete this.id;
        }
    },
    elapsed: function() {
        return !this.enabled ? 0 : (Date.now() - this.timestamp) / 1000;
    }
};

var OpQueue = {
    measureLag: function() {
        var now = Date.now();
        var interval = now - this.tick;
        if (interval >= this.unit) this.tick = now, this.operations = 0;
        if (this.operations < this.maxops) {
            this.operations += 1;
            return 0;
        }
        return this.unit - interval;
    },
    run: function() {
        this.timeout = null;
        var x = Math.min(this.queue.length, this.maxops);
        while (x--)
            this.put(this.queue.pop());
        if (this.queue.length)
            this.put(this.queue.pop());
    },
    put: function(func) {
        this.queue.push(func);
        var lag = this.measureLag();
        if (lag > 0 && this.timeout == null)
            this.timeout = window.setTimeout(this.run.bind(this), lag);
        if (lag === 0)
            this.queue.shift()();
    },
    clear: function() {
        window.clearTimeout(this.timeout);
        this.timeout = null;
        this.queue.splice(0, this.queue.length);
    }
};

var Queue = {
    put: function(item) {
        this.list.push(item);
    },
    get: function() {
        if (this.list.length) {
            var item = this.list[this.cursor];
            this.list[this.cursor] = null;
            if (++this.cursor * 2 >= this.list.length) {
                this.list.splice(0, this.cursor);
                this.cursor = 0;
            }
            return item;
        }
    },
    size: function() {
        return this.list.length - this.cursor;
    },
    peek: function(index) {
        if (this.list.length)
            return this.list[index || this.cursor];
    },
    clear: function() {
        this.list = [];
        this.cursor = 0;
    }
};

function createAdapter(store, prefix) {
    return {
        set: function(k, v) {
            if (typeof k == 'string') store.set(prefix + k, copyObject(v));
            else store.set(k);
        },
        get: function(k) {
            return copyObject(store.get(k ? prefix + k : null));
        }
    };
}

function createEvent() {
    return Object.create(Event, {
        listeners: {value: []}
    });
}

function createOpqueue(unit, maxops) {
    return Object.create(OpQueue, {
        queue: {value: []},
        operations: {value: 0, writable: true},
        timeout: {value: null, writable: true},
        tick: {value: 0, writable: true, enumerable: true},
        unit: {value: unit},
        maxops: {value: maxops}
    });
}

function createQueue() {
    return Object.create(Queue, {
        list: {value: []},
        cursor: {value: 0, writable: true}
    });
}

function createRegexp(s) {
    return new RegExp(expandWildcards(s));
}

function createTimer(c, i) {
    return Object.create(Timer, {
        callback: {value: c, writable: true},
        interval: {value: i, writable: true}
    });
}

function cloneObject(a) {
    return emulateObject(Object.create(Object.getPrototypeOf(a)), a);
}

function copyObject(v) {
    return typeof v == 'object' && v != null ?
        JSON.parse(JSON.stringify(v)) : v;
}

function dateString(tmpl) {
    var a = new Date(), b = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return formatString(tmpl, b[a.getMonth()], a.getDate(), a.getFullYear());
}

function diffObject(o, d) {
    var c = {added: {}, removed: [], values: {}};
    for (var k in o) {
        if (o[k].newValue != null) {
            c.added[k] = o[k].newValue;
            c.values[k] = o[k].newValue;
            continue;
        }
        c.values[k] = d[k];
        c.removed.push(k);
    }
    return c;
}

function echoFunction() {
    return function(c) { c(); }
}

function emulateObject(a, b) {
    if (b) {
        var c = Object.getOwnPropertyNames(b);
        for (var i = 0; i < c.length; i++) {
            var d = Object.getOwnPropertyDescriptor(b, c[i]);
            if (d.value && typeCheck(d.value) == 'object')
                d.value = cloneObject(d.value);
            Object.defineProperty(a, c[i], d);
        }
    }
    return a;
}

function equalsObject(a, b) {
    return JSON.stringify(a) == JSON.stringify(b);
}

function filterObject(o, l) {
    var d = {}, e = Object.getOwnPropertyNames(o);
    var k = Array.isArray(l) ? l : Object.keys(l);
    for (var i = 0; i < e.length; i++) {
        if (k.indexOf(e[i]) != -1)
            Object.defineProperty(d, e[i], Object.getOwnPropertyDescriptor(o, e[i]));
    }
    return d;
}

function formatString() {
    var v = Array.prototype.slice.call(arguments, 1);
    return arguments[0].replace(/{(\d+)}/g, function(s, x) {
        return v[x];
    });
}

function getValues(o) {
    var l = [];
    for (var k in o) l.push(o[k]);
    return l;
}

function httpGet(url, type, callback) {
    var req = new XMLHttpRequest();
    req.responseType = type;
    req.timeout = 10000;
    req.onload = function() {
        if (req.readyState === XMLHttpRequest.DONE)
            callback(req.status === 200 ? req.response : null);
    };
    req.onerror = req.ontimeout = function() { callback(null); };
    req.open('GET', url, true);
    req.send();
}

function iterateFunctions(a, b, c) {
    var f = Array.prototype.slice.call(a);
    (function p() {
        f.length ? b(f.shift(), p) : c && c();
    })();
}

function mergeObject(a, b) {
    for (var k in b) a[k] = b[k]; return a;
}

function objectPair(k, v) {
    if (typeof k == 'string') {
        var o = {}; o[k] = v;
        return o;
    }
    return k;
}

function processFunctions(a, b, c) {
    var d = arguments.length > 2 ? b : function() {};
    var e = arguments.length > 2 ? c : b;
    var f = Array.prototype.slice.call(a), l = f.length;
    var p = function() { d && d.apply(d, arguments); --l == 0 && e && e(); };
    window.setTimeout(function() {
        l == 0 && e && e();
        while (f[0]) { f.shift()(p); }
    }, 0);
}

function scanObject(a, b) {
    var o = {};
    for (var k in b) o[k] = k in a ? a[k] : b[k];
    return o;
}

function similarObject(a, b) {
    return function(c) { return c[a] === b; }
}

function timeString() {
    var t = new Date();
    return t.getHours() + ':' + t.getMinutes() + ':' + ('00' + t.getSeconds()).slice(-2);
}

function typeCheck(a) {
    var b = /(undefined|string|number|boolean)/.exec(typeof a);
    if (b) return b[1];
    return /\b([a-z]+).$/i.exec(Object.prototype.toString.call(a).toLowerCase())[1];
}

function uri(str) {
    var p = str.match(rxuri);
    return {
        host: p[4],
        protocol: p[2],
        path: p[5]
    };
}

return {
    adapter: createAdapter,
    clone: cloneObject,
    copy: copyObject,
    date: dateString,
    diff: diffObject,
    echo: echoFunction,
    emulate: emulateObject,
    equals: equalsObject,
    event: createEvent,
    filter: filterObject,
    format: formatString,
    http: httpGet,
    iterate: iterateFunctions,
    merge: mergeObject,
    object: objectPair,
    opqueue: createOpqueue,
    process: processFunctions,
    queue: createQueue,
    regexp: createRegexp,
    scan: scanObject,
    similarity: similarObject,
    time: timeString,
    timer: createTimer,
    type: typeCheck,
    uri: uri,
    values: getValues
};

});
