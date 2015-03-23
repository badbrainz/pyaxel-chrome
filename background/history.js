ext.define('extension.history', function() {

var messages = extension.messages;
var utils = extension.utils;
var storage = extension.storage;

var records = {};
var directory = 'history/';

function hash(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++)
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    return hash;
}

function id(item) {
    return directory + String(hash(item.origin));
}

function addItem(item) {
    var key = id(item);
    storage.local.set(utils.object(key, item));
}

function removeItem(item) {
    var key = id(item);
    storage.local.remove(key);
}

function searchItems(status, callback) {
    viewItems(function(items) {
        var results = [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].status === status)
                results.push(items[i]);
        }
        callback(results);
    });
}

function viewItems(callback) {
    storage.local.get(function(obj) {
        var results = [];
        for (var k in obj)
            k.indexOf(directory) === 0 && results.push(obj[k]);
        callback(results);
    });
}

function onJobCreated(job) {
    addItem(job.getSummary());
}

function onJobRemoved(job) {
    removeItem(job.getSummary());
}

return {
    bind: function() {
        messages.listen({
            'job-created': onJobCreated,
            'job-removed': onJobRemoved,
            'task-stopped': onJobCreated,
            'task-completed': onJobCreated
        });
    },
    add: addItem,
    remove: removeItem,
    search: searchItems,
    view: viewItems
};

});
