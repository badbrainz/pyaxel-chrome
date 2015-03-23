ext.define('extension.preferences', function() {

var messages = extension.messages;
var utils = extension.utils;

var settings = Object.create(null);
var defaults = Object.freeze({
    'popup_width': 500,
    'popup_height': 400,
    'config_width': 530,
    'config_height': 290,
    'contextmenu': 1,
    'delay': 20,
    'display': 1,
    'downloads': 2,
    'filename': 0,
    'host': '127.0.0.1',
    'icon': 1,
    'notify': 1,
    'options': 1,
    'output': 1,
    'path': '',
    'port': 8002,
    'reconnect': 5,
    'speed': 0,
    'splits': 4,
    'verbose': 0
});

function getPref(key) {
    if (typeof key == 'string')
        return settings[key] != null ? settings[key] : defaults[key];
    return utils.scan(settings, defaults);
}

function getCache() {
    return utils.merge({}, settings);
}

function setPref(argA, argB) {
    var p = utils.object(argA, argB), changes = {};

    for (var k in p) {
        if (k in defaults) {
            var c = {};
            if (k in settings) {
                if (utils.equals(p[k], settings[k]))
                    continue;
                c.oldValue = settings[k];
            }
            if (p[k] == null || utils.equals(p[k], defaults[k])) {
                if (settings[k] != null)
                    c.oldValue = settings[k];
                delete settings[k];
            }
            else
                c.newValue = settings[k] = p[k];
            if ('oldValue' in c || 'newValue' in c)
                changes[k] = c;
        }
    }

    if (Object.keys(changes).length) {
        changes = utils.diff(changes, getPref());
        changes.added = { 'settings/user': getCache() };
        changes.removed = [];
        messages.send('change-settings', changes);
    }
}

return {
    get: getPref,
    getCache: getCache,
    getChanges: getCache,
    set: setPref
};

});
