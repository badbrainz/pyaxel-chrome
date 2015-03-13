(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var catalogs = {
    all: {},
    started: {},
    stopped: {},
    unassigned: {}
};

var api = {
    add: function(item) {
        catalogs.all[item.id] = item;
        catalogs.unassigned[item.id] = item;
    },

    remove: function(id) {
        for (var k in catalogs)
            delete catalogs[k][id];
    },

    search: function(key, id) {
        if (key in catalogs) {
            if (id == null)
                return utils.values(catalogs[key]);
            if (typeof id === 'function')
                return utils.values(catalogs[key]).some(id);
            return catalogs[key][id];
        }
        return api.search('all', key);
    },

    debug: function() {
        debugger;
    }
};

messagebus.add({
    'name': 'catalog',
    'interface': function() {
        return utils.merge({}, api);
    },
    'task-created': function(task) {
        delete catalogs.unassigned[task.id];
    },
    'task-started': function(task) {
        catalogs.started[task.id] = catalogs.all[task.id];
    },
    'task-completed': function(task) {
        catalogs.stopped[task.id] = catalogs.all[task.id];
        delete catalogs.started[task.id];
    },
    'task-stopped': function(task) {
        delete catalogs.unassigned[task.id];
        delete catalogs.started[task.id];
        catalogs.stopped[task.id] = catalogs.all[task.id];
    }
});

})(global.extension);
