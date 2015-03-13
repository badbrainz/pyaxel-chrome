(function(ns) {

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

var event = {
    addListener: function(l) {
        this.removeListener(l);
        this.listeners.push(l);
    },
    removeListener: function(l) {
        var i = this.listeners.indexOf(l);
        if (i != -1) this.listeners.splice(i, 1);
    },
    dispatch: function() {
        for (var i = 0; i < this.listeners.length; i++)
            this.listeners[i].apply(null, arguments);
    },
    fire: function() {
        while (this.listeners.length)
            this.listeners.shift()();
        this.addListener = api.echo();
    }
};

var queue = {
    put: function(item) {
        this.list.push(item);
    },
    get: function() {
        if (this.list.length) {
            var item = this.list[this.space];
            this.list[this.space] = null;
            if (++this.space * 2 >= this.list.length) {
                this.list.splice(0, this.space);
                this.space = 0;
            }
            return item;
        }
    },
    size: function() {
        return this.list.length - this.space;
    }
};

var timer = {
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

var opqueue = {
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
            this.timeout = window.setTimeout(this.run, lag);
        if (lag === 0)
            this.queue.shift()();
    },
    clear: function() {
        window.clearTimeout(this.timeout);
        this.timeout = null;
        this.queue = [];
    }
};

var api = {
    adapter: function(store, prefix) {
        return {
            set: function(k, v) {
                if (typeof k == 'string') store.set(prefix + k, api.copy(v));
                else store.set(k);
            },
            get: function(k) {
                return api.copy(store.get(k ? prefix + k : null));
            }
        };
    },

    clone: function(a) {
        return api.emulate(Object.create(Object.getPrototypeOf(a)), a);
    },

    copy: function(v) {
        return typeof v == 'object' && v != null ?
            JSON.parse(JSON.stringify(v)) : v;
    },

    date: function(tmpl) {
        var a = new Date(), b = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return api.format(tmpl, b[a.getMonth()], a.getDate(), a.getFullYear());
    },

    diff: function(o, d) {
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
    },

    echo: function() {
        return function(c) { c(); }
    },

    emulate: function(a, b) {
        if (b) {
            var c = Object.getOwnPropertyNames(b);
            for (var i = 0; i < c.length; i++) {
                var d = Object.getOwnPropertyDescriptor(b, c[i]);
                if (d.value && api.type(d.value) == 'object')
                    d.value = api.clone(d.value);
                Object.defineProperty(a, c[i], d);
            }
        }
        return a;
    },

    equals: function(a, b) {
        return JSON.stringify(a) == JSON.stringify(b);
    },

    event: function() {
        return Object.create(event, { listeners: { value: [] } });
    },

    filter: function(o, l) {
        var d = {}, e = Object.getOwnPropertyNames(o);
        var k = Array.isArray(l) ? l : Object.keys(l);
        for (var i = 0; i < e.length; i++) {
            if (k.indexOf(e[i]) != -1)
                Object.defineProperty(d, e[i], Object.getOwnPropertyDescriptor(o, e[i]));
        }
        return d;
    },

    format: function() {
        var v = Array.prototype.slice.call(arguments, 1);
        return arguments[0].replace(/{(\d+)}/g, function(s, x) {
            return v[x];
        });
    },

    http: function(url, type, callback) {
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
    },

    iterate: function(a, b, c) {
        var f = Array.prototype.slice.call(a);
        (function p() {
            f.length ? b(f.shift(), p) : c && c();
        })();
    },

    merge: function(a, b) {
        for (var k in b) a[k] = b[k]; return a;
    },

    object: function(k, v) {
        if (typeof k == 'string') {
            var o = {}; o[k] = v;
            return o;
        }
        return k;
    },

    opqueue: function(unit, maxops) {
        return Object.create(opqueue, {
            queue: { value: [] },
            operations: { value: 0 },
            timeout: { value: null },
            tick: { value: global.extension.started },
            unit: { value: unit },
            maxops: { value: maxops }
        });
    },

    process: function(a, b, c) {
        var d = arguments.length > 2 ? b : function() {};
        var e = arguments.length > 2 ? c : b;
        var f = Array.prototype.slice.call(a), l = f.length;
        var p = function() { d && d.apply(d, arguments); --l == 0 && e && e(); };
        window.setTimeout(function() {
            l == 0 && e && e();
            while (f[0]) { f.shift()(p); }
        }, 0);
    },

    queue: function() {
        return Object.create(queue, {
            list: { value: [] },
            space: { value: 0, writable: true }
        });
    },

    regexp: function(s) {
        return new RegExp(expandWildcards(s));
    },

    scan: function(a, b) {
        var o = {};
        for (var k in b) o[k] = k in a ? a[k] : b[k];
        return o;
    },

    similarity: function(a, b) {
        return function(c) { return c[a] === b; }
    },

    time: function() {
        var t = new Date();
        return t.getHours() + ':' + t.getMinutes() + ':' + ('00' + t.getSeconds()).slice(-2);
    },

    timer: function(c, i) {
        return Object.create(timer, {
            callback: { value: c },
            interval: { value: i }
        });
    },

    type: function(a) {
        var b = /(undefined|string|number|boolean)/.exec(typeof a);
        if (b) return b[1];
        return /\b([a-z]+).$/i.exec(Object.prototype.toString.call(a).toLowerCase())[1];
    },

    uri: function(str) {
        var p = str.match(rxuri);
        return {
            host: p[4],
            protocol: p[2],
            path: p[5]
        };
    },

    values: function(o) {
        var l = [];
        for (var k in o) l.push(o[k]);
        return l;
    }
};

ns.utils = api;

})(global.extension);
