(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var preferences = messagebus.query('preferences');

var uid = 0;

function getAddress() {
    return utils.format('ws://{0}:{1}',
        preferences.get('host'), preferences.get('port'));
}

var api = {
    create: function() {
        var ws = new WebSocket(getAddress());
        ws.id = uid++;
        return ws;
    },

    debug: function() {
        debugger;
    }
};

messagebus.add({
    'name': 'sockets',
    'interface': function() {
        return utils.merge({}, api);
    }
});

})(global.extension);
