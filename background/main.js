(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var preferences = messagebus.query('preferences');
var script = messagebus.query('script');
var manager = messagebus.query('manager');
var sync = messagebus.query('sync');

var onready = utils.event();

var contextmenus = [{
    'documentUrlPatterns': ['*://*/*', 'chrome://downloads/*'],
    'title': 'Save',
    'id': 'save',
    'contexts': ['link', 'selection'],
    'onclick': function(info, tab) {
        manager.addJob({ url: info.linkUrl || info.selectionText }, true);
    }
},{
    'documentUrlPatterns': ['*://*/*', 'chrome://downloads/*'],
    'title': 'Queue',
    'id': 'queue',
    'contexts': ['link', 'selection'],
    'onclick': function(info, tab) {
        manager.addJob({ url: info.linkUrl || info.selectionText }, false);
    }
},{
    'documentUrlPatterns': ['*://*/*', 'chrome://downloads/*'],
    'title': 'Configure',
    'id': 'configure',
    'contexts': ['link', 'selection'],
    'onclick': function(info, tab) {
        displayConfiguration(info.linkUrl || info.selectionText);
    }
},{
    'documentUrlPatterns': ['*://*/*', 'chrome://downloads/*', 'chrome-extension://*/*'],
    'title': 'Downloads',
    'id': 'downloads',
    'onclick': displayDownloads
},{
    'documentUrlPatterns': ['*://*/*', 'chrome://downloads/*', 'chrome-extension://*/*'],
    'title': 'Preferences',
    'id': 'preferences',
    'onclick': displaySettings
}];

var scriptcommands = {
    'save': function(config) {
        manager.addJob(config, true);
    },

    'queue': function(config) {
        manager.addJob(config, false);
    },

    'configure': function(config) {
        displayConfiguration(config.url);
    },

    'search': function(id) {
        switch (typeof id) {
            case 'number':
            case 'string':
            case 'undefined':
                return manager.searchJobs('all', id);
                break;
        }
    }
};

function openUniqueTab(url, options) {
    chrome.tabs.query({url: url}, function(tabs) {
        if (tabs[0]) {
            chrome.windows.update(tabs[0].windowId, {focused: true}, function() {
                chrome.tabs.update(tabs[0].id, {active: true});
            });
            return;
        }
        if (options)
            chrome.windows.create({
                width: options.width || 530,
                height: options.height || 280,
                type: options.type,
                focused: true,
                url: url
            });
        else
            chrome.tabs.create({active: true, url: url}, function(tab) {
                chrome.windows.update(tab.windowId, {focused: true});
            });
    });
}

function displayDownloads() {
    if (preferences.get('display'))
        openUniqueTab(global.extension.source + 'views/downloads.html');
    else
        openUniqueTab(global.extension.source + 'views/popup.html', {
            type: 'popup',
            width: preferences.get('popup_width'),
            height: preferences.get('popup_height')
        });
}

function displaySettings() {
    openUniqueTab(global.extension.source + 'views/options.html');
}

function displayConfiguration(url) {
    var path = utils.format('{0}?url={1}',
        global.extension.source + 'views/configure.html', window.encodeURIComponent(url));
    openUniqueTab(path, {
        type: 'popup',
        width: preferences.get('config_width'),
        height: preferences.get('config_height')
    });
}

function updateContextMenus() {
    chrome.contextMenus.removeAll();
    if (preferences.get('contextmenu')) {
        for (var i = 0; i < contextmenus.length; i++) {
            delete contextmenus[i]['generatedId'];// WARN chrome adds this then throws WTF
            chrome.contextMenus.create(contextmenus[i]);
        }
    }
}

function parseOmniboxInput(input, disposition) {
    var params = script.parse(input);
    if (params) {
        script.make(params, function(code) {
            chrome.tabs.executeScript({
                code: code,
                allFrames: !!params.opts['allframes']
            });
        });
    }
}

function handleMessages(request, sender, callback) {
    if (request.cmd in scriptcommands) {
        var result = scriptcommands[request.cmd](request.data);
        if (result != null)
            callback(result);
    }
}

function handleRemoteSync(changes, area) {
    if (area === 'sync')
        sync.merge(changes);
}

function handleSettingsChanged(diff) {
    for (var k in diff.values) {
        switch (k) {
            case 'contextmenu':
                updateContextMenus();
                break;
        }
    }
}

function onRuntimeInstalled() {
    script.install(['default']);
    script.installModules(['deprecated', 'dllib', 'strlib']);
    displaySettings();
}

function onRuntimeUpdated(v) {
}

chrome.runtime.onInstalled.addListener(function(details) {
    onready.addListener(function() {
        if (details.reason === 'install')
            messagebus.broadcast('install-runtime');
        if (details.reason === 'update')
            messagebus.broadcast('update-runtime');
    });
});

global['exports'] = {
    'addDownload': function(config, ready) {
        manager.addJob(config, ready);
    },

    'retryDownload': function(id) {
        manager.retryJob(id);
    },

    'cancelDownload': function(id) {
        manager.stopJob(id);
    },

    'removeDownload': function(id) {
        manager.removeJob(id);
    },

    'pauseDownload': function(id) {
        manager.pauseJob(id);
    },

    'resumeDownload': function(id) {
        manager.resumeJob(id);
    },

    'clearDownloads': function() {
        manager.purgeJobs();
    },

    'getSettings': function() {
        return utils.adapter(preferences, '');
    },

    'getFilesystem': function() {
        return messagebus.query('filesystem');
    },

    'getDownloads': function() {
        return manager.searchJobs('all');
    },

    'displaySettings': displaySettings,
    'displayConfiguration': displayConfiguration
};

messagebus.query('storage').local.get(function(data) {
    var filesystem = messagebus.query('filesystem');
    var indicator = messagebus.query('indicator');
    var history = messagebus.query('history');
    var task = messagebus.query('task');

    task.config.verbose = preferences.get('verbose');
    task.config.max = preferences.get('downloads');
    indicator.config.onclick = displayDownloads;
    filesystem.config.directory = 'scripts';
    history.config.directory = 'history';

    messagebus.broadcast('sync-data', data);
    chrome.storage.onChanged.addListener(handleRemoteSync);
    chrome.runtime.onMessage.addListener(handleMessages);
    chrome.runtime.onMessageExternal.addListener(handleMessages);
    chrome.omnibox.onInputEntered.addListener(parseOmniboxInput);
    messagebus.add({
        'change-settings': handleSettingsChanged,
        'install-runtime': onRuntimeInstalled,
        'update-runtime': onRuntimeUpdated
    });

    sync.pull();
    history.view(task.init);
    updateContextMenus();
    onready.fire();
});

})(global.extension);
