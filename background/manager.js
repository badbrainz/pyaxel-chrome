ext.define('extension.manager', function() {

var messages = extension.messages;
var utils = extension.utils;
var preferences = extension.preferences;
var catalog = extension.catalog;

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
    messages.send('job-created', job);

    if (ready) {
        queue.put(job);
        messages.send('job-available');
    }
}

function addJob(config, ready) {
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
}

function getJob() {
    var job = queue.get();
    if (job && !catalog.search('unassigned', job.id))
        return getJob();
    return job;
}

function retryJob(id) {
    var job = catalog.search('stopped', id) || catalog.search('unassigned', id);
    if (job) {
        catalog.remove(job.id);
        messages.send('job-removed', job);
        addJob(job, true);
    }
}

function stopJob(id) {
    var job = catalog.search('started', id);
    if (job)
        messages.send('job-stopped', job);
}

function pauseJob(id) {
    var job = catalog.search('started', id);
    if (job)
        messages.send('job-paused', job);
}

function resumeJob(id) {
    var job = catalog.search('started', id);
    if (job)
        messages.send('job-resumed', job);
}

function removeJob(id) {
    var job = catalog.search('stopped', id) || catalog.search('unassigned', id);
    if (job) {
        catalog.remove(job.id);
        messages.send('job-removed', job);
    }
    return job;
}

function purgeJobs() {
    var jobs = catalog.search('stopped');
    for (var i = 0; i < jobs.length; i++) {
        catalog.remove(jobs[i].id);
        messages.send('job-removed', jobs[i]);
    }
}

function searchJobs(status) {
    return catalog.search(status);
}

function jobsQueued() {
    return queue.size();
}

function initJob(config) {
    var job = createJob(config);
    catalog.add(job);
    return job;
}

return {
    addJob: addJob,
    getJob: getJob,
    retryJob: retryJob,
    stopJob: stopJob,
    pauseJob: pauseJob,
    resumeJob: resumeJob,
    removeJob: removeJob,
    purgeJobs: purgeJobs,
    searchJobs: searchJobs,
    jobsQueued: jobsQueued,
    init: initJob
};

});
