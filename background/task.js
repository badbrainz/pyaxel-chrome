(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var manager = messagebus.query('manager');
var sockets = messagebus.query('sockets');
var preferences = messagebus.query('preferences');

var tasks = {};

var config = Object.seal({
    verbose: false
});

var iftask = {
    start: function() {
        this.socket.send(JSON.stringify({ cmd: ServerCommand.START, req: this.job.readData() }));
    },

    stop: function() {
        this.socket.send(JSON.stringify({ cmd: ServerCommand.STOP }));
    },

    abort: function() {
        this.socket.send(JSON.stringify({ cmd: ServerCommand.ABORT }));
    },

    quit: function() {
        this.socket.send(JSON.stringify({ cmd: ServerCommand.QUIT }));
    },

    update: function(data) {
        this.job.writeData(data);
        if (config.verbose) {
            this.job.log && console.log(this.job.log);
            delete this.job.log;
        }
    }
};

function createTask(socket, job) {
    return Object.create(iftask, {
        socket: { value: socket },
        job: { value: job, writable: true }
    });
}

function getTask(socket) {
    return tasks[socket.id];
}

function destroyTask(socket) {
    return delete tasks[socket.id];
}

function sendCommand(job, cmd) {
    for (var k in tasks) {
        if (tasks[k].job.id === job.id) {
            tasks[k][cmd]();
            break;
        }
    }
}

function broadcastStatus(job) {
    switch (job.status) {
        case JobStatus.CONNECTING:
            messagebus.broadcast('task-started', job);
            break;
        case JobStatus.STOPPED:
            messagebus.broadcast('task-paused', job);
            break;
        case JobStatus.VERIFIED:
        case JobStatus.COMPLETED:
            messagebus.broadcast('task-completed', job);
            break;
        case JobStatus.CANCELLED:
        case JobStatus.BAD_REQUEST:
        case JobStatus.INVALID:
        case JobStatus.ERROR:
            messagebus.broadcast('task-stopped', job);
            break;
    }
}

function establishConnection() {
    if (Object.keys(tasks).length >= (preferences.get('downloads') || Infinity))
        return;

    if (manager.jobsQueued()) {
        var ws = sockets.create();
        ws.onopen = onSocketOpen;
        ws.onclose = onSocketClose;
        ws.onerror = onSocketError;
        ws.onmessage = onSocketMessage;
        tasks[ws.id] = createTask(ws);
    }
}

function onSocketOpen(event) {
    var task = getTask(event.target);
    var job = manager.getJob();
    if (job) {
        task.job = job;
        task.start();
        messagebus.broadcast('task-created', task.job);
    }
    else
        task.quit();
}

function onSocketClose(event) {
    var task = getTask(event.target);

    destroyTask(event.target);

    if (!task.job)
        return;

    switch (task.job.status) {
        case JobStatus.CONNECTING:
        case JobStatus.FOUND:
        case JobStatus.PROCESSING:
        case JobStatus.CLOSING:
        case JobStatus.STOPPED:
            task.update({ status: JobStatus.CANCELLED });
            messagebus.broadcast('task-stopped', task.job);
            break;
    }

    establishConnection();
}

function onSocketError(event) {
    messagebus.broadcast('task-error', 'error: ' + event.target.url);
}

function onSocketMessage(event) {
    var task = getTask(event.target);

    task.update(JSON.parse(event.data));
    broadcastStatus(task.job);

    switch (task.job.status) {
        case JobStatus.VERIFIED:
        case JobStatus.COMPLETED:
            onSocketOpen(event);
            break;
        case JobStatus.CANCELLED:
        case JobStatus.BAD_REQUEST:
        case JobStatus.INVALID:
        case JobStatus.ERROR:
            onSocketOpen(event);
            break;
    }
}

var api = {
    config: config,

    init: function(configs) {
        var pref = preferences.get('notify');
        preferences.set('notify', 0);
        for (var i = 0; i < configs.length; i++) {
            var job = manager.init(configs[i]);
            broadcastStatus(job);
        }
        preferences.set('notify', pref);
    },

    debug: function() {
        debugger;
    }
};

messagebus.add({
    'name': 'task',
    'interface': function() {
        return utils.merge({}, api);
    },
    'job-available': function() {
        establishConnection();
    },
    'job-resumed': function(job) {
        sendCommand(job, 'start');
    },
    'job-paused': function(job) {
        sendCommand(job, 'stop');
    },
    'job-stopped': function(job) {
        sendCommand(job, 'abort');
    },
    'change-settings': function(diff) {
        for (var k in diff.values) {
            switch (k) {
                case 'verbose':
                    config.verbose = diff.values[k];
                    break;
            }
        }
    }
});

})(global.extension);
