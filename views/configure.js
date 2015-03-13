var extension = null;

function onClick(e) {
    if (e.target.id == 'save' || e.target.id == 'queue') {
        var url = $('url').value.trim();
        if (!url)
            return;
        var request = {
            'url': url,
            'metadata': {},
            'conf': {}
        };
        var val = $('referrer').value.trim();
        if (val)
            request.conf['referrer'] = val;
        val = $('path').value.trim();
        if (val)
            request.conf['download_path'] = val;
        val = $('name').value.trim();
        if (val)
            request.conf['output_filename'] = val;
        val = $('checksum').value.trim();
        if (val) {
            var hash = $('hash');
            request.metadata['hash'] = {
                'type': hash.options[hash.selectedIndex].text.toLowerCase(),
                'checksum': val
            };
        }
        val = +$('splits').value;
        if (!isNaN(val) && val > 0)
            request.conf['num_connections'] = val;
        val = +$('speed').value;
        if (!isNaN(val) && val >= 0)
            request.conf['max_speed'] = val * 1024;
        extension.addDownload(request, e.target.id == 'save');
        window.close();
    }
    else if (e.target.id == 'cancel')
        window.close();
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(bg) {
        extension = bg.exports;
        var url = location.search.substring(5);
        var e = $('url');
        if (!url) {
            e.removeAttribute('disabled');
            e.focus();
        }
        e.value = e.title = decodeURIComponent(url);
        var settings = extension.getSettings();
        $('path').value = settings.get('path');
        $('speed').value = settings.get('speed');
        $('splits').value = settings.get('splits');
        $('controls').addEventListener('click', onClick);
    });
}, false);
