ext.define('extension.tasks', function() {

var messages = extension.messages;
var utils = extension.utils;
var manager = extension.manager;
var sockets = extension.sockets;

var tasks = {};

var config = Object.seal({
    max: Infinity,
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
            messages.send('task-started', job);
            break;
        case JobStatus.STOPPED:
            messages.send('task-paused', job);
            break;
        case JobStatus.VERIFIED:
        case JobStatus.COMPLETED:
            messages.send('task-completed', job);
            break;
        case JobStatus.CANCELLED:
        case JobStatus.BAD_REQUEST:
        case JobStatus.INVALID:
        case JobStatus.ERROR:
            messages.send('task-stopped', job);
            break;
    }
}

function establishConnection() {
    if (Object.keys(tasks).length >= config.max)
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
        messages.send('task-created', task.job);
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
            messages.send('task-stopped', task.job);
            break;
    }

    establishConnection();
}

function onSocketError(event) {
    messages.send('task-error', 'error: ' + event.target.url);
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

function onJobAvailable() {
    establishConnection();
}

function onJobResumed(job) {
    sendCommand(job, 'start');
}

function onJobPaused(job) {
    sendCommand(job, 'stop');
}

function onJobStopped(job) {
    sendCommand(job, 'abort');
}

return {
    bind: function() {
        messages.listen({
            'job-available': onJobAvailable,
            'job-resumed': onJobResumed,
            'job-paused': onJobPaused,
            'job-stopped': onJobStopped
        });
    },
    config: config
};

});
