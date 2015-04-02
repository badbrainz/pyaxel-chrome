{
    save: function(msg)
    {
        chrome.extension.sendMessage({cmd:'save', data:msg})
    },
    queue: function(msg)
    {
        chrome.extension.sendMessage({cmd:'queue', data:msg})
    },
    search: function(msg, callback)
    {
        chrome.extension.sendMessage({cmd:'search', data:msg}, callback)
    },
    configure: function(msg)
    {
        chrome.extension.sendMessage({cmd:'configure', data:msg})
    }
}
