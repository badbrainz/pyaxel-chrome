(function() {

var messages = extension.messages;
var utils = extension.utils;
var preferences = extension.preferences;
var script = extension.script;
var manager = extension.manager;
var tasks = extension.tasks;
var onready = utils.event();

var script_commands = {
    save: function(config) {
        manager.addJob(config, true);
    },
    queue: function(config) {
        manager.addJob(config, false);
    },
    configure: function(config) {
        displayConfiguration(config.url);
    },
    search: function(id) {
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

function onContextMenu(info, tab) {
    switch (info.menuItemId) {
        case 'save':
            manager.addJob({url: info.linkUrl || info.selectionText}, true);
            break;
        case 'queue':
            manager.addJob({url: info.linkUrl || info.selectionText}, false);
            break;
        case 'configure':
            displayConfiguration(info.linkUrl || info.selectionText);
            break;
        case 'downloads':
            displayDownloads();
            break;
        case 'preferences':
            displaySettings();
            break;
        case 'save':
            break;
    }
}

function addContextmenuItem(x) {
    chrome.contextMenus.create(utils.merge({
        documentUrlPatterns: ['*://*/*', 'chrome://*/*', 'chrome-extension://*/*'],
        contexts: ['page', 'frame'],
        onclick: onContextMenu
    }, x));
}

function updateContextMenus() {
    chrome.contextMenus.removeAll(function() {
        if (preferences.get('contextmenu')) {
            addContextmenuItem({title: 'Save', id: 'save', contexts: ['link', 'selection']});
            addContextmenuItem({title: 'Queue', id: 'queue', contexts: ['link', 'selection']});
            addContextmenuItem({title: 'Configure', id: 'configure', contexts: ['link', 'selection']});
            addContextmenuItem({title: 'Downloads', id: 'downloads'});
            addContextmenuItem({title: 'Preferences', id: 'preferences'});
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
    if (request.cmd in script_commands) {
        var result = script_commands[request.cmd](request.data);
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
            case 'verbose':
                tasks.config.verbose = diff.values[k];
                break;
        }
    }
}

function onRuntimeInstalled() {
    script.install('scripts/', ['default']);
    script.install('modules/', ['deprecated', 'dllib', 'strlib']);
    displaySettings();
}

function onRuntimeUpdated(v) {
}

chrome.runtime.onInstalled.addListener(function(details) {
    onready.addListener(function() {
        messages.send(details.reason + '-runtime');
    });
});

window.exports = {
    addDownload: function(config, ready) {
        manager.addJob(config, ready);
    },
    retryDownload: function(id) {
        manager.retryJob(id);
    },
    cancelDownload: function(id) {
        manager.stopJob(id);
    },
    removeDownload: function(id) {
        manager.removeJob(id);
    },
    pauseDownload: function(id) {
        manager.pauseJob(id);
    },
    resumeDownload: function(id) {
        manager.resumeJob(id);
    },
    clearDownloads: function() {
        manager.purgeJobs();
    },
    getSettings: function() {
        return utils.adapter(preferences, '');
    },
    getFilesystem: function() {
        return extension.filesystem;
    },
    getDownloads: function() {
        return manager.searchJobs('all');
    },
    displaySettings: displaySettings,
    displayConfiguration: displayConfiguration
};

utils.series([
    function(pass) {
        extension.storage.local.get({'settings/user': preferences.get()}, function(o) {
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
        chrome.runtime.onMessage.addListener(handleMessages);
        chrome.runtime.onMessageExternal.addListener(handleMessages);
        chrome.omnibox.onInputEntered.addListener(parseOmniboxInput);
        extension.indicator.bind();
        extension.storage.bind();
        extension.catalog.bind();
        extension.history.bind();
        extension.tasks.bind();
        messages.listen({
            'change-settings': handleSettingsChanged,
            'install-runtime': onRuntimeInstalled,
            'update-runtime': onRuntimeUpdated
        });

        extension.tasks.config.max = preferences.get('downloads');
        extension.tasks.config.verbose = preferences.get('verbose');
        extension.indicator.config.onclick = displayDownloads;

        updateContextMenus();

        onready.fire();
    }
);

})();
