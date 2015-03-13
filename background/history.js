(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var storage = messagebus.query('storage');

var records = {};

var config = Object.seal({
    directory: ''
});

function hash(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++)
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    return hash;
}

function id(item) {
    return config.directory + '/' + String(hash(item.origin));
}

var api = {
    config: config,

    add: function(item) {
        var key = id(item);
        storage.local.set(utils.object(key, item));
    },

    remove: function(item) {
        var key = id(item);
        storage.local.remove(key);
    },

    search: function(status, callback) {
        api.view(function(items) {
            var results = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].status === status)
                    results.push(items[i]);
            }
            callback(results);
        });
    },

    view: function(callback) {
        storage.local.get(function(obj) {
            var results = [], key = config.directory + '/';
            for (var k in obj)
                k.indexOf(key) === 0 && results.push(obj[k]);
            callback(results);
        });
    },

    debug: function() {
        debugger;
    }
};

messagebus.add({
    'name': 'history',
    'interface': function() {
        return utils.merge({}, api);
    },
    'job-created': function(job) {
        api.add(job.getSummary());
    },
    'job-removed': function(job) {
        api.remove(job.getSummary());
    },
    'task-stopped': function(job) {
        api.add(job.getSummary());
    },
    'task-completed': function(job) {
        api.add(job.getSummary());
    }
});

})(global.extension);
