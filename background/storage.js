(function(ns) {

var messagebus = ns.messagebus;
var utils = ns.utils;

var api = {
    local: chrome.storage.local,
    remote: chrome.storage.sync,
    QUOTA_BYTES_PER_ITEM: chrome.storage.sync.QUOTA_BYTES_PER_ITEM,
    WRITE_OPERATIONS_PER_MINUTE: chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE
};

messagebus.add({
    'name': 'storage',
    'interface': function() {
        return utils.merge({}, api);
    },
    'change-settings': function(o) {
        chrome.storage.local.set(o.added);
        chrome.storage.local.remove(o.removed);
    }
});

})(global.extension);
