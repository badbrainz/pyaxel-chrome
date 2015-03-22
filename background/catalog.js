ext.define('extension.catalog', function() {

var messages = extension.messages;
var utils = extension.utils;

var catalogs = {
    all: {},
    started: {},
    stopped: {},
    unassigned: {}
};

function onTaskCreated(task) {
    delete catalogs.unassigned[task.id];
}

function onTaskStarted(task) {
    catalogs.started[task.id] = catalogs.all[task.id];
}

function onTaskCompleted(task) {
    catalogs.stopped[task.id] = catalogs.all[task.id];
    delete catalogs.started[task.id];
}

function onTaskStopped(task) {
    delete catalogs.unassigned[task.id];
    delete catalogs.started[task.id];
    catalogs.stopped[task.id] = catalogs.all[task.id];
}

function searchItem(key, id) {
    if (key in catalogs) {
        if (id == null)
            return utils.values(catalogs[key]);
        if (typeof id === 'function')
            return utils.values(catalogs[key]).some(id);
        return catalogs[key][id];
    }
    return searchItem('all', key);
}

function removeItem(id) {
    for (var k in catalogs)
        delete catalogs[k][id];
}

function addItem(item) {
    catalogs.all[item.id] = item;
    catalogs.unassigned[item.id] = item;
}

return {
    bind: function() {
        messages.listen({
            'task-created': onTaskCreated,
            'task-started': onTaskStarted,
            'task-completed': onTaskCompleted,
            'task-stopped': onTaskStopped
        });
    },
    add: addItem,
    remove: removeItem,
    search: searchItem
};

});
