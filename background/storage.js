ext.define('extension.storage', function() {

var messages = extension.messages;

function onSettingsChanged(o) {
    chrome.storage.local.set(o.added);
    chrome.storage.local.remove(o.removed);
}

return {
    bind: function() {
        messages.listen({
            'change-settings': onSettingsChanged
        });
    },
    local: chrome.storage.local,
    remote: chrome.storage.sync,
    BYTES_PER_ITEM: chrome.storage.sync.QUOTA_BYTES_PER_ITEM,
    UNIT: 3600000,
    OPS_PER_UNIT: chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_HOUR
};

});
