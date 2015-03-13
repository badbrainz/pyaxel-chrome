var extensions = null;

gui.remove = function(root, download) {
    if (!root.parentNode)
        return;
    if (getPanel(download).state !== getJobState(download))
        root.parentNode.removeChild(root);
};

gui.insert = function(root, download) {
    if (getPanel(download).state !== getJobState(download))
        $(getJobState(download)).insertAdjacentElement('afterEnd', root);
};

panel_interface.update = function(download) {
    this.status = download.status;
    this.state = getJobState(download);
};

panel_interface.commands = {
    'cancel': function(panel) {
        extension.cancelDownload(panel.id);
    },

    'retry': function(panel) {
        extension.retryDownload(panel.id);
        removePanel(panel);
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
    }
};

function processInputbox(cmd) {
    var input = $('uri');
    if (!input.value.trim())
        return;
    extension.addDownload({ url: input.value.trim() }, true);
    input.value = '';
}

function clearDisplay() {
    $('display').classList.add('collapsed');
    downloads.clear();
    $('display').classList.remove('collapsed');
}

function onKeyup(e) {
    if (e.target.id == 'uri') {
        if (e.keyCode == 13) processInputbox('save');
    }
}

function onClick(e) {
    switch (e.target.id) {
        case 'configure':
            if ($('uri').value.trim()) {
                extension.displayConfiguration($('uri').value.trim());
                $('uri').value = '';
            }
            break;
        case 'submit':
            processInputbox('save');
            break;
        case 'settings':
            extension.displaySettings();
            break;
        case 'clear':
            clearDisplay();
            extension.clearDownloads();
            update();
            break;
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
        gui.settings = extension.getSettings();
        gui.conf.shortname = gui.settings.get('filename');
        if (gui.settings.get('output') == 0) {
            downloads.renderer = createRenderer;
            $('display').classList.add('simple');
        }
        $('inputbox').addEventListener('keyup', onKeyup);
        $('inputbox').addEventListener('click', onClick);
        $('toolbar').addEventListener('click', onClick);
        window.setInterval(update, 1000);
        update();
    });
}, false);
