ext.define('extension.utils', function() {

var rxmeta = /([.*:;'"!@#$%^&?\-+=<>\\\/~`|(){}\[\]])/g;
var rxmetachars = /(\\[bcdfnrtvsw])/ig;
var rxregx = /^\/.*\/$/;
// http://tools.ietf.org/html/rfc3986#appendix-B
var rxuri = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
var rxhost = /^(?:[^@]+@)?([0-9a-z.-]+)(?::\d*)?$/i;
var rxauth = /^[^@]+@/;
var rxport = /:\d+$/;

function escapeMetachars(s) {
    return s.replace(rxmeta, '\\$1').replace(rxmetachars, '\\\\$1');
}

function expandWildcards(s) {
    return rxregx.test(s) ? s.substr(1, s.length - 2) : (s.indexOf('*') != -1 ?
        s.split('*').map(escapeMetachars).join('(.*?)') : escapeMetachars(s));
}

function authority(u) {
    return u.split('://')[1].split('/')[0];
}

function filter(o, l) {
    var d = {}, e = Object.getOwnPropertyNames(o);
    var k = Array.isArray(l) ? l : Object.keys(l);
    for (var i = 0; i < e.length; i++) {
        if (k.indexOf(e[i]) != -1)
            Object.defineProperty(d, e[i],
                Object.getOwnPropertyDescriptor(o, e[i]));
    }
    return d;
}

function format() {
    var v = Array.prototype.slice.call(arguments, 1);
    return arguments[0].replace(/{(\d+)}/g, function(s, x) {
        return v[x];
    });
}

function grep(s, o) {
    var r = regexp(s), a = Array.isArray(o), t = [];
    var d = !a ? Object.getOwnPropertyNames(o) : o;
    for (var i = 0; i < d.length; i++) {
        if (r.test(d[i]))
            t.push(d[i]);
    }
    return a ? t : filter(o, t);
}

function jsFileName(str) {
    return str.replace(/\.js$/, '') + '.js';
}

function hostname(u, p) {
    var s = u.split('://');
    return (p ? s[0] + '://' : '') + rxhost.exec(s[1].split('/')[0])[1];
}

function origin(u) {
    var host = rxuri.exec(u)[4];
    return !host ? '' : host.replace(rxauth, '').replace(rxport, '');
}

function regexp(s) {
    return new RegExp(expandWildcards(s));
}

return {
    authority: authority,
    filter: filter,
    format: format,
    grep: grep,
    jsname: jsFileName,
    hostname: hostname,
    origin: origin,
    regexp: regexp
};

});
