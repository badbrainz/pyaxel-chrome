ext.define('extension.utils', function() {

var rxpath = /^(?:(?:\/|\/(?:[^\/]+\/)+)|(?:[a-zA-Z]:\\|[a-zA-Z]:\\(?:[^\\]+\\)+))$/;
var rxip = /^(([01]?\d\d?|2[0-4]\d|25[0-5])\.){3}([01]?\d\d?|25[0-5]|2[0-4]\d)$/;

function formatBytes(b) {
    if (!b) return '';
    var c = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'];
    var d = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, Math.floor(d))).toFixed(2) + c[d];
}

return {
    formatBytes: formatBytes,
    path: rxpath,
    ip: rxip
};

});

ext.define('extension.dllib', function() {

var utils = extension.utils;
var status_strings = {};
var panels = {};
var bar = {};
var pie = {};

bar.width = 600;
bar.height = 8;

pie.width = 48;
pie.height = 48;
pie.radius = 24;
pie.centerX = 24;
pie.centerY = 24;
pie.base = -0.5 * Math.PI;
pie.base2 = 0.02 * Math.PI;
pie.dir = false;

status_strings[JobStatus.BAD_REQUEST] = 'Bad request';
status_strings[JobStatus.CANCELLED] = 'Cancelled';
status_strings[JobStatus.CLOSING] = 'Disconnecting';
status_strings[JobStatus.CONNECTING] = 'Connecting';
status_strings[JobStatus.COMPLETED] = 'Completed';
status_strings[JobStatus.ERROR] = 'Error';
status_strings[JobStatus.FOUND] = 'Initializing';
status_strings[JobStatus.INVALID] = 'Invalid';
status_strings[JobStatus.PROCESSING] = 'In progress';
status_strings[JobStatus.RESERVED] = 'Verifying checksum';
status_strings[JobStatus.STOPPED] = 'Paused';
status_strings[JobStatus.VERIFIED] = 'Completed';

var downloads = Object.create({
    renderer: createRenderer,
    update: updatePanel,
    clear: clearPanels
});

var gui = {
    settings: null,
    conf: {
        shortname: false
    },
    get: function(id) {
        var input = $(id);
        if (!input) return;
        switch (input.type) {
            case 'checkbox':
                return input.checked = this.settings.get(id);
                break;
            case 'text':
                return input.value = this.settings.get(id);
                break;
        }
    },
    set: function(id) {
        var input = $(id);
        if (!input) return;
        switch (input.type) {
            case 'checkbox':
                this.settings.set(id, +input.checked);
                break;
            case 'text':
                this.settings.set(id, /(host|path)/.test(id) ? input.value : +input.value);
                break;
        }
    },
    create: createRoot,
    search: getRoot,
    insert: insertRoot,
    remove: removeRoot
};

var Panel = {
    status: -1,
    commands: {},
    handleEvent: function(e) {
        if (e.target.className in this.commands)
            this.commands[e.target.className](this);
    },
    update: function(download) {
        this.status = download.status;
        this.state = getJobState(download);
        this.onupdate();
    },
    draw: function(download) {},
    onupdate: function() {}
};

function getStatusString(download) {
    return status_strings[download.status] || 'Queued';
}

function getJobState(download) {
    switch (download.status) {
    case JobStatus.CONNECTING:
    case JobStatus.PROCESSING:
    case JobStatus.CLOSING:
    case JobStatus.STOPPED:
    case JobStatus.RESERVED:
    case JobStatus.FOUND:
        return 'active';
    case JobStatus.COMPLETED:
    case JobStatus.VERIFIED:
        return 'completed';
    case JobStatus.BAD_REQUEST:
    case JobStatus.CANCELLED:
    case JobStatus.INVALID:
    case JobStatus.ERROR:
        return 'cancelled';
    default:
        return 'queued';
    }
}

function getTaskState(download) {
    switch (download.status) {
    case JobStatus.PROCESSING:
    case JobStatus.RESERVED:
        return 'running';
    case JobStatus.STOPPED:
        return 'idle';
    case JobStatus.CONNECTING:
    case JobStatus.CLOSING:
    case JobStatus.FOUND:
        return 'waiting';
    case JobStatus.COMPLETED:
    case JobStatus.VERIFIED:
        return 'completed';
    case JobStatus.BAD_REQUEST:
    case JobStatus.CANCELLED:
    case JobStatus.INVALID:
    case JobStatus.ERROR:
    default:
        return 'cancelled';
    }
}

function createRoot(listener, download) {
    var root = createElement('div', 'panel');
    root.appendChild(createElement('div', 'date'));
    var metadata = root.appendChild(createElement('div', 'metadata'));
    metadata.appendChild(createPie(download.id));
    var labels = metadata.appendChild(createElement('div', 'labels'));
    labels.appendChild(createMeasurementLabel('percent', 'size', 'rate', 'name'));
    labels.appendChild(createLink(null, download.origin));
    labels.appendChild(createElement('div', 'status'));
    labels.appendChild(createProgressBar('vertical-stripes'));
    var controls = labels.appendChild(createControlBar('Pause', 'Resume', 'Retry', 'Cancel', 'Remove'));
    controls.addEventListener('click', listener, false);
    root.id = 'panel_' + download.id;
    return root;
}

function createControlBar(var_args) {
    var node = createElement('div', 'controls');
    for (var i = 0; i < arguments.length; i++)
        node.appendChild(createControl(arguments[i]));
    return node;
}

function createMeasurementLabel(var_args) {
    var node = createElement('div', 'measurements');
    for (var i = 0; i < arguments.length; i++)
        node.appendChild(createElement('div', arguments[i]));
    return node;
}

function createPie(id) {
    var node = createElement('div', 'pie');
    node.appendChild(createElement('div', 'background'));
    node.appendChild(createElement('div', 'foreground')).style.webkitMask = utils.format('-webkit-canvas(disc_{0})', id);
    return node;
}

function createProgressBar(cls) {
    var node = document.createElement('canvas');
    node.className = 'progress';
    node.classList.add(cls);
    node.width = bar.width;
    node.height = 8;
    return node;
}

function createControl(value) {
    var node = document.createElement('div');
    node.className = value.toLowerCase();
    node.appendChild(createTextNode(value));
    return node;
}

function createTextNode(value) {
    return document.createTextNode(value != null ? value : '');
}

function createLink(onclick, href, value) {
    var node = document.createElement('a');
    node.onclick = onclick;
    node.href = href;
    node.className = 'url';
    href && (node.target = '_blank');
    node.appendChild(createTextNode(value != null ? value : href));
    return node;
}

function createElement(type, className, content) {
    var node = document.createElement(type);
    if (className)
        node.className = className;
    if (typeof content !== 'undefined') {
        if (typeof content === 'string')
            node.appendChild(createTextNode(content));
        else
            node.innerHTML = content;
    }
    return node;
}

function insertRoot(root, download) {
    if (!root.parentNode)
        document.body.insertAdjacentElement('afterEnd', root);
}

function removeRoot(root, download) {
    if (root.parentNode)
        root.parentNode.removeChild(root);
}

function getRoot(download) {
    return document.querySelector('#panel_' + download.id);
}

function updateRoot(panel, download) {
    var root = gui.search(download) || gui.create(panel, download);
    gui.remove(root, download);
    root.className = 'panel';
    root.classList.add(getTaskState(download));
    root.querySelector('.status').innerText = getStatusString(download);
    root.querySelector('.name').innerText = (gui.conf.shortname ? download.name : download.path) || '';
    root.querySelector('.size').innerText = utils.formatBytes(download.size);
    root.querySelector('.date').innerText = download.date;
    gui.insert(root, download);
}

function getRate(root) {
    return root.querySelector('.rate');
}

function getPercent(root) {
    return root.querySelector('.percent');
}

function getProgressContext2d(root) {
    var c = root.querySelector('.progress').getContext('2d');
    c.fillStyle = '#6797AC';
    return c;
}

function getDiscContext2d(root) {
    return document.getCSSCanvasContext('2d', root.id.replace('panel_', 'disc_'), pie.width, pie.height);
}

function drawPie(canvas, percent) {
    var x = pie.centerX;
    var y = pie.centerY;
    canvas.clearRect(0, 0, pie.width, pie.height);
    canvas.beginPath();
    canvas.moveTo(x, y);
    canvas.arc(x, y, pie.radius, pie.base, pie.base + pie.base2 * percent, false);
    canvas.lineTo(x, y);
    canvas.fill();
    canvas.closePath();
}

function drawBar(canvas, progress, size) {
    var z = bar.width;
    var n = z / progress.length;
    var w = bar.height;
    canvas.clearRect(0, 0, bar.width, bar.height);
    for (var i = 0; i < progress.length; i++)
        canvas.fillRect(i * n, 0, progress[i] * z / size, w);
}

function createPanel(download) {
    return Object.create(Panel, {
        'id': {
            value: download.id,
            configurable: false,
            enumerable: true,
            writable: false
        }
    });
}

function updatePanel(download) {
    if (!(download.id in panels))
        panels[download.id] = createPanel(download);
    var p = panels[download.id];
    if (p.status !== download.status) {
        updateRoot(p, download);
        updateRenderer(p, download);
        p.update(download);
    }
    p.draw(download);
}

function getPanel(download) {
    return panels[download.id];
}

function removePanel(panel) {
    var root = gui.search(panel);
    if (root.parentNode)
        root.parentNode.removeChild(root);
    delete panels[panel.id];
}

function updateRenderer(panel, download) {
    delete panel.draw;
    var renderer = downloads.renderer(download);
    if (renderer)
        panel.draw = renderer;
}

function clearPanels() {
    for (var k in panels)
        removePanel(panels[k]);
}

function createProgressRenderer(root) {
    var rate = getRate(root);
    var perc = getPercent(root);
    var disc = getDiscContext2d(root);
    var prog = getProgressContext2d(root);
    return function(download) {
        var p = Math.floor(sum(download.progress) / download.size * 100);
        perc.innerText = p;
        rate.innerText = download.rate;
        drawPie(disc, p);
        drawBar(prog, download.progress, download.size);
    }
}

function createRenderer(download) {
     if (/idle|running/.test(getTaskState(download)))
        return createProgressRenderer(gui.search(download));
}

function sum(l) {
    var m = 0;
    for (var i = 0, il = l.length; i < il; m += l[i++]);
    return m;
}

function calculatePercent(download) {
    return Math.floor(sum(download.progress) / download.size * 100);
}

return {
    config: {
        bar: bar,
        pie: pie
    },
    createRoot: createRoot,
    createControlBar: createControlBar,
    createMeasurementLabel: createMeasurementLabel,
    createPie: createPie,
    createProgressBar: createProgressBar,
    createControl: createControl,
    createTextNode: createTextNode,
    createLink: createLink,
    createElement: createElement,
    createPanel: createPanel,
    clearPanels: clearPanels,
    createProgressRenderer: createProgressRenderer,
    createRenderer: createRenderer,
    drawPie: drawPie,
    drawBar: drawBar,
    downloads: downloads,
    getStatusString: getStatusString,
    getJobState: getJobState,
    getTaskState: getTaskState,
    getRoot: getRoot,
    getRate: getRate,
    getPercent: getPercent,
    getProgressContext2d: getProgressContext2d,
    getDiscContext2d: getDiscContext2d,
    getPanel: getPanel,
    getCompleted: calculatePercent,
    gui: gui,
    insertRoot: insertRoot,
    Panel: Panel,
    panels: panels,
    removeRoot: removeRoot,
    removePanel: removePanel,
    strings: status_strings,
    updateRenderer: updateRenderer,
    updateRoot: updateRoot,
    updatePanel: updatePanel
};

});
