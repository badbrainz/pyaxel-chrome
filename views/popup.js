ext.define('ext', function() {

var utils = extension.utils;
var dllib = extension.dllib;
var exports;

dllib.config.pie.width = 36;
dllib.config.pie.height = 36;
dllib.config.pie.radius = 18;
dllib.config.pie.centerX = 18;
dllib.config.pie.centerY = 18;

dllib.downloads.renderer = function(download) {
    if (/idle|running/.test(dllib.getTaskState(download)))
        return simpleRenderer(dllib.gui.search(download));
};

dllib.gui.create = function(listener, download) {
    var root = dllib.createElement('div', 'panel');
    root.appendChild(dllib.createElement('div', 'date'));
    root.appendChild(dllib.createPie(download.id));
    var labels = root.appendChild(dllib.createElement('div', 'labels'));
    labels.appendChild(dllib.createElement('div', 'name'));
    labels.appendChild(dllib.createMeasurementLabel('percent', 'size', 'rate'));
    labels.appendChild(dllib.createLink(null, download.origin));
    labels.appendChild(dllib.createElement('div', 'status'));
    var controls = labels.appendChild(dllib.createControlBar('Pause', 'Resume', 'Retry', 'Cancel', 'Remove'));
    controls.addEventListener('click', listener, false);
    root.id = 'panel_' + download.id;
    return root;
};

dllib.gui.remove = function(root, download) {};

dllib.gui.insert = function(root, download) {
    if (!root.parentNode)
        $('display').insertAdjacentElement('afterBegin', root);
};

dllib.Panel.update = function(download) {
    this.status = download.status;
    var state = this.state;
    this.state = dllib.getJobState(download);
    if (state !== this.state)
        updateStatusInfo();
};

dllib.Panel.commands = {
    cancel: function(panel) {
        exports.cancelDownload(panel.id);
    },
    retry: function(panel) {
        exports.retryDownload(panel.id);
    },
    pause: function(panel) {
        exports.pauseDownload(panel.id);
    },
    resume: function(panel) {
        exports.resumeDownload(panel.id);
    },
    remove: function(panel) {
        exports.removeDownload(panel.id);
        dllib.removePanel(panel);
        updateStatusInfo();
    }
};

function simpleRenderer(root) {
    var rate = dllib.getRate(root);
    var perc = dllib.getPercent(root);
    var disc = dllib.getDiscContext2d(root);
    return function(download) {
        var p = dllib.getCompleted(download);
        perc.innerText = p;
        rate.innerText = download.rate;
        dllib.drawPie(disc, p);
    }
}

function setStatusInfo(active, total) {
    $('status').innerText = utils.format('Downloading: {0}/{1}', active, total);
}

function updateStatusInfo() {
    var n = 0;
    for (var p in dllib.panels)
        if (dllib.panels[p].state === 'active')
            n++;
    setStatusInfo(n, Object.keys(dllib.panels).length);
}

function onClick(e) {
    if (e.target.id == 'configure')
        exports.displayConfiguration('');
    else if (e.target.id == 'settings')
        exports.displaySettings();
    else if (e.target.id === 'clear') {
        setStatusInfo(0, 0);
        $('display').classList.add('collapsed');
        dllib.downloads.clear();
        $('display').classList.remove('collapsed');
        exports.clearDownloads();
        update();
    }
}

function update() {
    var l = exports.getDownloads();
    for (var i = 0; i < l.length; i++)
        dllib.downloads.update(l[i]);
}

return {
    initialize: function() {
        chrome.runtime.getBackgroundPage(function(background) {
            exports = background.exports;
            dllib.gui.conf.shortname = exports.getSettings().get('filename');
            $('footer').addEventListener('click', onClick);
            window.setInterval(update, 1000);
            update();
        });
    }
};

});

document.addEventListener('DOMContentLoaded', ext.initialize);
