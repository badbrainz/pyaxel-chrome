var extension = null;

pie.width = 36;
pie.height = 36;
pie.radius = 18;
pie.centerX = 18;
pie.centerY = 18;

downloads.renderer = function(download) {
    if (/idle|running/.test(getTaskState(download)))
        return simpleRenderer(gui.search(download));
};

gui.create = function(listener, download) {
    var root = createElement('div', 'panel');
    root.appendChild(createElement('div', 'date'));
    root.appendChild(createPie(download.id));
    var labels = root.appendChild(createElement('div', 'labels'));
    labels.appendChild(createElement('div', 'name'));
    labels.appendChild(createMeasurementLabel('percent', 'size', 'rate'));
    labels.appendChild(createLink(null, download.origin));
    labels.appendChild(createElement('div', 'status'));
    var controls = labels.appendChild(createControlBar('Pause', 'Resume', 'Retry', 'Cancel', 'Remove'));
    controls.addEventListener('click', listener, false);
    root.id = 'panel_' + download.id;
    return root;
};

gui.remove = function(root, download) {};

gui.insert = function(root, download) {
    if (!root.parentNode)
        $('display').insertAdjacentElement('afterBegin', root);
};

panel_interface.update = function(download) {
    this.status = download.status;
    var state = this.state;
    this.state = getJobState(download);
    if (state !== this.state)
        updateStatusInfo();
};

panel_interface.commands = {
    'cancel': function(panel) {
        extension.cancelDownload(panel.id);
    },

    'retry': function(panel) {
        extension.retryDownload(panel.id);
    },

    'pause': function(panel) {
        extension.pauseDownload(panel.id);
    },

    'resume': function(panel) {
        extension.resumeDownload(panel.id);
    },

    'remove': function(panel) {
        extension.removeDownload(panel.id);
        removePanel(panel);
        updateStatusInfo();
    }
};

function simpleRenderer(root) {
    var rate = getRate(root);
    var perc = getPercent(root);
    var disc = getDiscContext2d(root);
    return function(download) {
        var p = Math.floor(sum(download.progress) / download.size * 100);
        perc.innerText = p;
        rate.innerText = download.rate;
        drawPie(disc, p);
    }
}

function setStatusInfo(active, total) {
    $('status').innerText = print('Downloading: {0}/{1}', active, total);
}

function updateStatusInfo() {
    var n = 0;
    for (var p in panels)
        if (panels[p].state === 'active')
            n++;
    setStatusInfo(n, Object.keys(panels).length);
}

function onClick(e) {
    if (e.target.id == 'configure')
        extension.displayConfiguration('');
    else if (e.target.id == 'settings')
        extension.displaySettings();
    else if (e.target.id === 'clear') {
        setStatusInfo(0, 0);
        $('display').classList.add('collapsed');
        downloads.clear();
        $('display').classList.remove('collapsed');
        extension.clearDownloads();
        update();
    }
}

function update() {
    var l = extension.getDownloads();
    for (var i = 0; i < l.length; i++)
        downloads.update(l[i]);
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(bg) {
        extension = bg.exports;
        gui.conf.shortname = extension.getSettings().get('filename');
        $('footer').addEventListener('click', onClick);
        window.setInterval(update, 1000);
        update();
    });
}, false);
