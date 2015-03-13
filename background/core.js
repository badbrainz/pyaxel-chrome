var global = this;

(function(ns) {

var components = [];

ns.extension = {};
ns.extension.started = Date.now();
ns.extension.source = chrome.runtime.getURL('');

ns.extension.messagebus = {
    add: function(component) {
        console.assert(components.indexOf(component) === -1,
            'error: component already defined.');
        components.push(component);
    },

    remove: function(component) {
        var i = components.indexOf(component);
        if (i != -1)
            components.splice(i, 1);
    },

    query: function(name) {
        for (var i = 0; i < components.length; i++) {
            var component = components[i];
            if (component['name'] === name) {
                var api = component['interface'];
                if (api)
                    return api.apply(component, Array.prototype.slice.call(arguments, 1));
            }
        }
    },

    broadcast: function() {
        var event = arguments[0];
        for (var i = 0; i < components.length; i++) {
            var component = components[i];
            if (event in component) {
                try {
                    component[event].apply(component, Array.prototype.slice.call(arguments, 1));
                } catch (err) {
                    console.error(err.stack);
                }
            }
        }
    }
};

})(global);
