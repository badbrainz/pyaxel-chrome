ext.define('extension.utils', function() {

// http://tools.ietf.org/html/rfc3986#appendix-B
var rxuri = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

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

function createTimer(c, i) {
    return Object.create(Timer, {
        callback: {value: c, writable: true},
        interval: {value: i, writable: true}
    });
}

function cloneObject(a) {
    return emulateObject(Object.create(Object.getPrototypeOf(a)), a);
}

function dateString(tmpl) {
    var a = new Date(), b = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return extension.utils.format(tmpl, b[a.getMonth()], a.getDate(), a.getFullYear());
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

function jsFileName(str) {
    return str.replace(/\.js$/, '') + '.js';
}

function similarObject(a, b) {
    return function(c) { return c[a] === b; }
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
    clone: cloneObject,
    date: dateString,
    emulate: emulateObject,
    http: httpGet,
    similarity: similarObject,
    timer: createTimer,
    type: typeCheck,
    uri: uri,
    values: getValues
};

});
