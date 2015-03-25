ext.define('ext', function() {

var modal = extension.modal;
var dllib = extension.dllib;

function getError(input) {
    var msg;
    switch (input.id) {
        case 'host':
            if (!dllib.regex.ip.test(input.value.trim()))
                msg = 'Invalid IP address';
            break;
        case 'path':
            var value = input.value.trim();
            if (value && !dllib.regex.path.test(value))
                msg = 'Invalid path';
            break;
        case 'port':
        case 'speed':
        case 'reconnect':
        case 'delay':
        case 'splits':
        case 'downloads':
            var value = input.value.trim();
            if (!/^\d+$/.test(value))
                msg = 'Invalid number';
            else if (value < +input.min)
                msg = 'Min value is ' + input.min;
            else if (value > (+input.max || Infinity))
                msg = 'Max value is ' + input.max;
            break;
    }
    return msg;
}

function onTestServerEvent(e) {
    var error = getError($('host')) || getError($('port'));
    if (!error) {
        var ws;
        modal.show('notify',
            'Server status', 'Connecting...',
            function(overlay) {
                var address = 'ws://' + dllib.gui.get('host') + ':' + dllib.gui.get('port');
                ws = new window.WebSocket(address);
                ws.onopen = function(event) {
                    ws.send(JSON.stringify({'cmd': ServerCommand.QUIT}));
                    overlay.end('Connected:', address);
                };
                ws.onerror = function(event) {
                    overlay.end('No connection:', address);
                };
            },
            function() {
                if (!ws) return;
                switch (ws.readyState) {
                    case WebSocketEvent.CONNECTING: ws.close(WebSocketStatus.APPLICATION); break;
                    case WebSocketEvent.OPEN: ws.close(WebSocketStatus.NORMAL); break;
                }
            });
    }
    else
        modal.show('info', 'Error', error);
}

function onInputKeyEvent(e) {
    switch (e.keyIdentifier) {
        case 'U+001B':
            dllib.gui.get(e.target.id);
            e.preventDefault();
            break;
        case 'Enter':
            e.target.blur();
            break;
    }
}

function onInputBlurEvent(e) {
    var error = getError(e.target);
    if (error) {
        modal.show('info', 'Error', error);
        dllib.gui.get(e.target.id);
        return;
    }
    //e.target.value = +e.target.value.trim();// TODO fix '01' values
    dllib.gui.set(e.target.id);
}

function resetUI() {
    dllib.gui.get('host');
    dllib.gui.get('port');
    dllib.gui.get('delay');
    dllib.gui.get('downloads');
    dllib.gui.get('path');
    dllib.gui.get('reconnect');
    dllib.gui.get('splits');
    dllib.gui.get('speed');
}

function initEvents() {
    relayEvent(document.body, 'keyup', 'input[type=text]', onInputKeyEvent);
    relayEvent(document.body, 'blur', 'input[type=text]', onInputBlurEvent, true);
    $('test').addEventListener('click', onTestServerEvent, false);
}

return {
    initialize: function() {
        chrome.runtime.getBackgroundPage(function(background) {
            dllib.gui.settings = background.exports.getSettings();
            initEvents();
            resetUI();
        });

        if (!window.localStorage.firstRun) {
            window.localStorage.firstRun = 1;
            var css = document.createElement('link');
            css.rel = 'stylesheet';
            css.type = 'text/css';
            css.href = 'firstrun.css';
            document.head.appendChild(css);
            modal.show('intro');
        }
    }
};

});

document.addEventListener('DOMContentLoaded', ext.initialize);
