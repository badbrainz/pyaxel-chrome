ext.define('extension.utils', function() {

var rxaccept = /^https?:\/\/(?!(chrome\.google\.com\/webstore))/;
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
        this.addListener = echo();
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

function adapter(store, prefix) {
    return {
        set: function(k, v) {
            if (typeof k === 'string') store.set(prefix + k, copy(v));
            else store.set(k);
        },
        get: function(k) {
            return copy(store.get(k ? prefix + k : null));
        }
    };
}

function copy(v) {
    return typeof v === 'object' && v != null ? JSON.parse(JSON.stringify(v)) : v;
}

function diff(o, d) {
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

function echo() {
    return function(c) { c(); }
}

function equals(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function event() {
    return Object.create(Event, {listeners: {value: []}});
}

function icon(e, o) {
    var size = o.size;
    e.width = e.height = size;
    var ctx = e.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(o.image, 0, 0, size, size);
    if (o.text) {
        var padding = 2;
        var height = o.font + padding * 2;
        var width = Math.min(size, ctx.measureText(o.text).width + padding * 2);
        var left = size - width;
        var top = size - height + 3;// (Lnx) 3px adjustment
        var fill = ctx.createLinearGradient(0, 9, 0, 13);
        fill.addColorStop(0, '#888');
        fill.addColorStop(1, '#333');
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, width, height);
        ctx.fillRect(left, top, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + o.font + 'px Arial';
        ctx.fillText(o.text, left + padding, size - padding, size);
    }
    return ctx.getImageData(0, 0, size, size);
}

function iterate(a, b, c) {
    var f = Array.prototype.slice.call(a);
    (function p() {
        f.length ? b(f.shift(), p) : c && c();
    })();
}

function merge(a, b) {
    for (var k in b) a[k] = b[k]; return a;
}

function object(k, v) {
    if (typeof k === 'string') {
        var o = {}; o[k] = v;
        return o;
    }
    return k;
}

function opqueue(unit, maxops) {
    return Object.create(OpQueue, {
        queue: {value: []},
        operations: {value: 0, writable: true},
        timeout: {value: null, writable: true},
        tick: {value: 0, writable: true, enumerable: true},
        unit: {value: unit},
        maxops: {value: maxops}
    });
}

function permitted(u) {
    return rxaccept.test(u);
}

function process(a, c) {
    var f = Array.prototype.slice.call(a), l = f.length;
    var p = function() { --l === 0 && c && c(); };
    window.setTimeout(function() {
        !l && c && c();
        while (f[0]) { f.shift()(p); }
    }, 0);
}

function queue() {
    return Object.create(Queue, {
        list: {value: []},
        cursor: {value: 0, writable: true}
    });
}

function scan(a, b) {
    var o = {};
    for (var k in b) o[k] = k in a ? a[k] : b[k];
    return o;
}

function series(a, b, c) {
    var f = Array.prototype.slice.call(a);
    var p = function() { b(arguments[0]); !f.length && c && c(); };
    window.setTimeout(function() {
        !l && c && c();
        while (f[0]) { f.shift()(p); }
    }, 0);
}

function time() {
    var t = new Date();
    return t.getHours() + ':' + t.getMinutes() + ':' +
        ('00' + t.getSeconds()).slice(-2);
}

return {
    adapter: adapter,
    copy: copy,
    diff: diff,
    echo: echo,
    equals: equals,
    event: event,
    icon: icon,
    iterate: iterate,
    merge: merge,
    object: object,
    opqueue: opqueue,
    permitted: permitted,
    process: process,
    queue: queue,
    scan: scan,
    series: series,
    time: time
};

});
