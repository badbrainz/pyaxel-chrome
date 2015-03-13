(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var storage = messagebus.query('storage');

var config = Object.seal({
    directory: ''
});

function error() {
    if (chrome.runtime.lastError)
        return chrome.runtime.lastError.message;
}

function splitpath(path) {
    var dir = path.split('/'), file = dir.pop();
    return {
        dir: dir.join('/') || config.directory,
        file: file
    };
}

function fixpath(path) {
    var parts = splitpath(path);
    return parts.dir + '/' + parts.file;
}

function strippath(path) {
    return splitpath(path).file;
}

function stringify(file, callback) {
    var reader = new FileReader();
    reader.onloadend = function(e) { callback(e.target.result); };
    reader.readAsText(file, 'UTF-8');
}

var api = {
    config: config,

    read: function(path, encoding, callback) {
        var key = fixpath(path);
        storage.local.get(key, function(obj) {
            callback(obj[key]);
        });
    },

    write: function(path, data, callback) {
        var key = fixpath(path);
        function write(str) {
            storage.local.set(utils.object(key, str), function() {
                var err = error();
                callback && callback(err);
                if (!err) {
                    var changes = utils.object(key, { newValue: str });
                    changes = utils.diff(changes, utils.object(key, str));
                    messagebus.broadcast('change-settings', changes);
                }
            });
        }
        if (typeof data === 'string')
            write(data);
        else
            stringify(data, write);
    },

    mkdir: function(dir, callback) {
        callback();
    },

    remove: function(path, callback) {
        var key = fixpath(path);
        storage.local.remove(key, function() {
            var err = error();
            callback && callback(err);
            if (!err) {
                var changes = utils.object(key, {});
                changes = utils.diff(changes, {});
                messagebus.broadcast('change-settings', changes);
            }
        });
    },

    ls: function(dir, callback) {
        storage.local.get(function(obj) {
            var key = fixpath(dir), result = [];
            for (var k in obj)
                k.indexOf(key) === 0 && result.push(strippath(k));
            callback(result);
        });
    },

    debug: function() {
        debugger;
    }
};

messagebus.add({
    'name': 'filesystem',
    'interface': function() {
        return utils.merge({}, api);
    },
    'sync-data': function(data) {
        var rx = /^(scripts|modules)\/.+$/;
        for (var k in data) {
            if (!rx.test(k))
                continue;
            if (data[k] != null)
                api.write(k, data[k]);
            else
                api.remove(k);
        }
    }
});

})(global.extension);
