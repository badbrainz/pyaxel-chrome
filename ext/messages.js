ext.define('extension.messages', function() {

var components = [];
var runtime = {
    send: function(message, fn) {
        chrome.runtime.sendMessage(message, fn);
    }
};

function listen(component) {
    components.push(component);
}

function ignore(component) {
    var i = components.indexOf(component);
    if (i != -1)
        components.splice(i, 1);
}

function send() {
    var event = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < components.length; i++) {
        var component = components[i];
        if (event in component)
            component[event].apply(component, args);
    }
}

return {
    listen: listen,
    ignore: ignore,
    send: send,
    runtime: runtime
};

});
