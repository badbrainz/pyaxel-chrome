window.ext = (function(parent) {

function namespace(name) {
    var obj = parent;
    var parts = name.split('.');
    while (parts[0]) {
        var ns = parts.shift();
        obj = ns in obj ? obj[ns] : obj[ns] = {};
    }
    return obj;
}

function define(name, fn) {
    var component = namespace(name);
    var exports = fn();
    for (var prop in exports) {
        if (prop in component)
            continue;
        component[prop] = exports[prop];
    }
}

return {
    define: define
};

})(window);
