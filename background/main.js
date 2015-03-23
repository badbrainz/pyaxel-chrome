(function() {

var messages = extension.messages;
var utils = extension.utils;
var preferences = extension.preferences;
var script = extension.script;
var manager = extension.manager;

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

function openExtensionView(fn, options) {
    var url = chrome.runtime.getURL(fn);
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
        openExtensionView('downloads.html');
    else
        openExtensionView('popup.html', {
            type: 'popup',
            width: preferences.get('popup_width'),
            height: preferences.get('popup_height')
        });
}

function displaySettings() {
    openExtensionView('options.html');
}

function displayConfiguration(url) {
    var path = utils.format('{0}?url={1}', 'configure.html', window.encodeURIComponent(url));
    openExtensionView(path, {
        type: 'popup',
        width: preferences.get('config_width'),
        height: preferences.get('config_height')
    });
}

function updateContextMenus() {
    chrome.contextMenus.removeAll(function() {
        if (preferences.get('contextmenu')) {
            for (var i = 0; i < contextmenus.length; i++) {
                delete contextmenus[i]['generatedId'];// WARN chrome adds this then throws WTF
                chrome.contextMenus.create(contextmenus[i]);
            }
        }
    });
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
            messages.send('install-runtime');
        if (details.reason === 'update')
            messages.send('update-runtime');
    });
});

window.exports = {
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
        return extension.filesystem;
    },

    'getDownloads': function() {
        return manager.searchJobs('all');
    },

    'displaySettings': displaySettings,
    'displayConfiguration': displayConfiguration
};

utils.series([
    function(pass) {
        extension.storage.local.get('settings/user', function(o) {
            if ('settings/user' in o)
                preferences.set(o['settings/user']);
            pass();
        });
    },
    function(pass) {
        extension.history.view(function(items) {
            for (var i = 0; i < items.length; i++)
                manager.init(items[i]);
            pass();
        });
    }],
    function() {
        extension.task.config.verbose = preferences.get('verbose');
        extension.task.config.max = preferences.get('downloads');
        extension.indicator.config.onclick = displayDownloads;
        extension.filesystem.config.directory = 'scripts';

        chrome.runtime.onMessage.addListener(handleMessages);
        chrome.runtime.onMessageExternal.addListener(handleMessages);
        chrome.omnibox.onInputEntered.addListener(parseOmniboxInput);
        extension.indicator.bind();
        extension.storage.bind();
        extension.filesystem.bind();
        extension.catalog.bind();
        extension.history.bind();
        extension.task.bind();
        messages.listen({
            'change-settings': handleSettingsChanged,
            'install-runtime': onRuntimeInstalled,
            'update-runtime': onRuntimeUpdated
        });
        
        extension.tasks.config.max = preferences.get('downloads');
        extension.tasks.config.verbose = preferences.get('verbose');

        updateContextMenus();
        onready.fire();
    }
);

})();
