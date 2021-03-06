ext.define('extension.indicator', function() {

var messages = extension.messages;
var utils = extension.utils;
var preferences = extension.preferences;

var count = [];
var timer = utils.timer(updateFrame, 120);
var data = {
    clipX: 0,
    backimg: new Image(19, 19),
    foreimg: new Image(38, 10),
    canvas: document.createElement('canvas')
};

var config = Object.seal({
    onclick: null
});

function startAnimation() {
    timer.start();
}

function stopAnimation() {
    timer.stop();
    reloadImage();
}

function incrementCount(id) {
    if (count.indexOf[id] !== -1) {
        count.push(id);
        updateIndicator();
    }
}

function decrementCount(id) {
    var i = count.indexOf[id];
    if (i !== -1) {
        count.splice(i, 1);
        updateIndicator();
    }
}

function reloadImage() {
    data.context.clearRect(0, 0, 19, 19);
    data.context.drawImage(data.backimg, 0, 0);
    chrome.browserAction.setIcon({ imageData: data.context.getImageData(0, 0, 19, 19) });
}

function updateFrame() {
    var x = data.clipX;
    x = x == 18 ? 0 : x + 1;
    var ctx = data.context;
    ctx.clearRect(0, 0, 19, 19);
    ctx.drawImage(data.backimg, 0, 0);
    ctx.drawImage(data.foreimg, x, 0, 19, 10, 0, 4, 19, 10);
    chrome.browserAction.setIcon({ imageData: ctx.getImageData(0, 0, 19, 19) });
    data.clipX = x;
}

function updateBadge(n) {
    chrome.browserAction.setBadgeText({
        text: n ? String(n) : ''
    });
}

function updateIndicator() {
    if (preferences.get('icon')) {
        updateBadge(0);
        count.length ? startAnimation() : stopAnimation();
    }
    else {
        updateBadge(count.length);
        stopAnimation();
    }
}

function displayNotification(title, body) {
    if (!preferences.get('notify'))
        return;

    chrome.tabs.query({
        lastFocusedWindow: true,
        active: true,
        url: chrome.runtime.getURL(preferences.get('display') ? 'downloads.html' : 'popup.html')
    }, function(tabs) {
        if (!tabs.length) {
            var icon = chrome.runtime.getURL('graph/32.png');
            var wnd = window.webkitNotifications.createNotification(icon, title, body);
            var id = window.setTimeout(function() { wnd.cancel(); }, 7000);
            wnd.onclose = function() { window.clearTimeout(id); };
            wnd.show();
        }
    });
}

data.backimg.src = 'graph/19.png';
data.foreimg.src = 'graph/bits.png';
data.canvas.width = 19;
data.canvas.height = 19;
data.context = data.canvas.getContext('2d');

chrome.browserAction.setBadgeBackgroundColor({ color: '#555' });
chrome.browserAction.onClicked.addListener(function() {
    if (config.onclick)
        config.onclick();
});

function onTaskCreated(task) {
    incrementCount(task.id);
    updateIndicator();
}

function onTaskStopped(task) {
    decrementCount(task.id);
    updateIndicator();
    displayNotification('Download stopped', task.origin);
}

function onTaskCompleted(task) {
    decrementCount(task.id);
    updateIndicator();
    displayNotification('Download completed', task.origin);
}

function onSettingsChanged(diff) {
    for (var k in diff.values) {
        switch (k) {
            case 'icon':
                updateIndicator();
                break;
        }
    }
}

return {
    bind: function() {
        messages.listen({
            'task-created': onTaskCreated,
            'task-stopped': onTaskStopped,
            'task-completed': onTaskCompleted,
            'change-settings': onSettingsChanged
        });
    },
    config: config
};

});
