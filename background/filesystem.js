ext.define('extension.filesystem', function() {

var messages = extension.messages;
var utils = extension.utils;
var storage = extension.storage;

var directory = 'scripts/';

function error() {
    if (chrome.runtime.lastError)
        return chrome.runtime.lastError.message;
}

function splitpath(path) {
    var i = path.lastIndexOf('/') + 1;
    return {
        dir: path.substr(0, i) || directory,
        file: path.substr(i)
    };
}

function fixpath(path) {
    var parts = splitpath(path);
    return parts.dir + parts.file;
}

function strippath(path) {
    return splitpath(path).file;
}

function stringify(file, callback) {
    var reader = new FileReader();
    reader.onloadend = function(e) { callback(e.target.result); };
    reader.readAsText(file, 'UTF-8');
}

function listFiles(dir, callback) {
    storage.local.get(function(obj) {
        var key = fixpath(dir), result = [];
        for (var k in obj)
            k.indexOf(key) === 0 && result.push(strippath(k));
        callback(result);
    });
}

function makeDirectory(dir, callback) {
    callback();
}

function removeFile(path, callback) {
    var key = fixpath(path);
    storage.local.remove(key, function() {
        var err = error();
        callback && callback(err);
        if (!err) {
            var changes = utils.object(key, {});
            changes = utils.diff(changes, {});
            messages.send('change-settings', changes);
        }
    });
}

function readFile(path, encoding, callback) {
    var key = fixpath(path);
    storage.local.get(key, function(obj) {
        callback(obj[key]);
    });
}

function writeFile(path, data, callback) {
    var key = fixpath(path);
    function write(str) {
        storage.local.set(utils.object(key, str), function() {
            var err = error();
            callback && callback(err);
            if (!err) {
                var changes = utils.object(key, { newValue: str });
                changes = utils.diff(changes, utils.object(key, str));
                messages.send('change-settings', changes);
            }
        });
    }
    if (typeof data === 'string')
        write(data);
    else
        stringify(data, write);
}

return {
    read: readFile,
    write: writeFile,
    mkdir: makeDirectory,
    remove: removeFile,
    ls: listFiles
};

});
