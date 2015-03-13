(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var preferences = messagebus.query('preferences');
var catalog = messagebus.query('catalog');

var uid = 0;
var queue = utils.queue();

var Job = function() {
    this.id = uid++;
    this.url = '';
    this.origin = '';
    this.log = '';
    this.metadata = {};
    this.conf = {
        'download_path': preferences.get('path'),
        'reconnect_delay': preferences.get('delay'),
        'max_speed': preferences.get('speed') * 1024,
        'max_reconnect': preferences.get('reconnect'),
        'num_connections': preferences.get('splits'),
        'verbose': preferences.get('verbose')
    };
};

Job.prototype.writeData = function(data) {
    utils.merge(this, data);
};

Job.prototype.readData = function() {
    return utils.filter(this, ['url', 'metadata', 'conf']);
};

Job.prototype.getSummary = function() {
    return utils.filter(this, ['conf', 'date', 'metadata', 'origin', 'status', 'url']);
};

function createJob(config) {
    return config instanceof Job ? config : utils.merge(new Job, config);
}

function setupJob(config, ready) {
    var job = createJob(config);
    job.status = JobStatus.QUEUED;
    job.date = utils.date('{0} {1}, {2}');

    catalog.add(job);
    messagebus.broadcast('job-created', job);

    if (ready) {
        queue.put(job);
        messagebus.broadcast('job-available');
    }
}

var api = {
    addJob: function(config, ready) {
        var cfg = utils.merge({}, config);
        if (!cfg.url)
            return;

        cfg.origin = cfg.origin || cfg.url;
        if (typeof cfg.origin !== 'string')
            return;

        var uri = utils.uri(cfg.origin);
        if (!uri.protocol || !uri.host || !uri.path)
            return;

        if (!/https?/.test(uri.protocol))
            return;

        var func = utils.similarity('origin', cfg.origin);
        if (catalog.search(func))
            return;

        if (/\.meta(4|link)$/.test(uri.path)) {
            utils.http(cfg.origin, 'document', function(xml) {
                if (xml == null) {
                    console.warn('[%s] request error: %s', utils.time(), cfg.origin);
                    return;
                }
                var files = parseMetalinkXML(xml);
                for (var i = 0; i < files.length; i++)
                    setupJob(files[i], ready);
            });
        }
        else
            setupJob(cfg, ready);
    },

    getJob: function() {
        var job = queue.get();
        if (job && !catalog.search('unassigned', job.id))
            return api.getJob();
        return job;
    },

    retryJob: function(id) {
        var job = catalog.search('stopped', id) || catalog.search('unassigned', id);
        if (job) {
            catalog.remove(job.id);
            messagebus.broadcast('job-removed', job);
            api.addJob(job, true);
        }
    },

    stopJob: function(id) {
        var job = catalog.search('started', id);
        if (job)
            messagebus.broadcast('job-stopped', job);
    },

    pauseJob: function(id) {
        var job = catalog.search('started', id);
        if (job)
            messagebus.broadcast('job-paused', job);
    },

    resumeJob: function(id) {
        var job = catalog.search('started', id);
        if (job)
            messagebus.broadcast('job-resumed', job);
    },

    removeJob: function(id) {
        var job = catalog.search('stopped', id) || catalog.search('unassigned', id);
        if (job) {
            catalog.remove(job.id);
            messagebus.broadcast('job-removed', job);
        }
        return job;
    },

    purgeJobs: function() {
        var jobs = catalog.search('stopped');
        for (var i = 0; i < jobs.length; i++) {
            catalog.remove(jobs[i].id);
            messagebus.broadcast('job-removed', jobs[i]);
        }
    },

    searchJobs: function(status) {
        return catalog.search(status);
    },

    jobsQueued: function() {
        return queue.size();
    },

    init: function(config) {
        var job = createJob(config);
        catalog.add(job);
        return job;
    },

    debug: function() {
        debugger;
    }
};

messagebus.add({
    'name': 'manager',
    'interface': function() {
        return utils.merge({}, api);
    }
});

})(global.extension);
