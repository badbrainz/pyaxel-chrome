function onCheckboxEvent(e) {
    gui.set(e.target.id);
    return true;
}

function resetUI() {
    gui.get('host');
    gui.get('port');
    gui.get('delay');
    gui.get('downloads');
    gui.get('path');
    gui.get('reconnect');
    gui.get('splits');
    gui.get('speed');
    gui.get('contextmenu');
    gui.get('display');
    gui.get('filename');
    gui.get('icon');
    gui.get('notify');
    gui.get('output');
    gui.get('verbose');
}

function initEvents() {
    relayEvent(document.body, 'click', 'input[type=checkbox]', onCheckboxEvent);
}

document.addEventListener('DOMContentLoaded', function onContentLoaded() {
    chrome.runtime.getBackgroundPage(function(background) {
        gui.settings = background.exports.getSettings();
        initEvents();
        resetUI();
    });
}, false);
