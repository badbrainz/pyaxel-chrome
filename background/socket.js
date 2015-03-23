ext.define('extension.sockets', function() {

var utils = extension.utils;
var preferences = extension.preferences;

var uid = 0;

function getAddress() {
    return utils.format('ws://{0}:{1}',
        preferences.get('host'), preferences.get('port'));
}

function createSocket() {
    var ws = new WebSocket(getAddress());
    ws.id = uid++;
    return ws;
}

return {
    create: createSocket
};

});
