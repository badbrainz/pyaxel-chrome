document.addEventListener('DOMContentLoaded', function onContentLoaded() {
    document.removeEventListener('DOMContentLoaded', onContentLoaded, false);
    var params = {};
    var query = document.location.search.substring(1).split('&');
    for (var i in query) {
        var kv = query[i].split('=');
        params[kv[0]] = decodeURIComponent(kv[1]);
    }
    document.getElementById('title').appendChild(document.createTextNode(params['title']));
    document.getElementById('body').appendChild(document.createTextNode(params['body']));
}, false);
