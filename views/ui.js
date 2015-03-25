ext.define('ext', function() {

var dllib = extension.dllib;

function onCheckboxEvent(e) {
    dllib.gui.set(e.target.id);
    return true;
}

function resetUI() {
    dllib.gui.get('contextmenu');
    dllib.gui.get('display');
    dllib.gui.get('filename');
    dllib.gui.get('icon');
    dllib.gui.get('notify');
    dllib.gui.get('output');
    dllib.gui.get('verbose');
}

function initEvents() {
    relayEvent(document.body, 'click', 'input[type=checkbox]', onCheckboxEvent);
}

return {
    initialize: function onContentLoaded() {
        chrome.runtime.getBackgroundPage(function(background) {
            dllib.gui.settings = background.exports.getSettings();
            initEvents();
            resetUI();
        });
    }
};

});

document.addEventListener('DOMContentLoaded', ext.initialize);
