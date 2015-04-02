ext.define('ext', function() {

var dllib = extension.dllib;
var exports;

function processInputbox(cmd) {
    var input = $('uri');
    if (!input.value.trim())
        return;
    exports.addDownload({ url: input.value.trim() }, true);
    input.value = '';
}

function clearDisplay() {
    $('display').classList.add('collapsed');
    dllib.downloads.clear();
    $('display').classList.remove('collapsed');
}

function updateDisplay() {
    var l = exports.getDownloads();
    for (var i = 0; i < l.length; i++)
        dllib.downloads.update(l[i]);
}


function onKeyup(e) {
    if (e.target.id == 'uri') {
        if (e.keyCode == 13)
            processInputbox('save');
    }
}

function onClick(e) {
    switch (e.target.id) {
        case 'configure':
            if ($('uri').value.trim()) {
                exports.displayConfiguration($('uri').value.trim());
                $('uri').value = '';
            }
            break;
        case 'submit':
            processInputbox('save');
            break;
        case 'settings':
            exports.displaySettings();
            break;
        case 'clear':
            clearDisplay();
            exports.clearDownloads();
            updateDisplay();
            break;
    }
}

dllib.gui.remove = function(root, download) {
    if (!root.parentNode)
        return;
    if (dllib.getPanel(download).state !== dllib.getJobState(download))
        root.parentNode.removeChild(root);
};

dllib.gui.insert = function(root, download) {
    if (dllib.getPanel(download).state !== dllib.getJobState(download))
        $(dllib.getJobState(download)).insertAdjacentElement('afterEnd', root);
};

dllib.Panel.commands = {
    cancel: function(panel) {
        exports.cancelDownload(panel.id);
    },
    retry: function(panel) {
        exports.retryDownload(panel.id);
        dllib.removePanel(panel);
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
    }
};

return {
    initialize: function() {
        chrome.runtime.getBackgroundPage(function(background) {
            exports = background.exports;
            dllib.gui.settings = exports.getSettings();
            dllib.gui.conf.shortname = dllib.gui.settings.get('filename');
            if (dllib.gui.settings.get('output') == 0)
                $('display').classList.add('simple');
            $('inputbox').addEventListener('keyup', onKeyup);
            $('inputbox').addEventListener('click', onClick);
            $('toolbar').addEventListener('click', onClick);
            window.setInterval(updateDisplay, 1000);
            updateDisplay();
        });
    }
};

});

document.addEventListener('DOMContentLoaded', ext.initialize);
