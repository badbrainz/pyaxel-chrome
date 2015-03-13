document.addEventListener('DOMContentLoaded', function() {
    $('report').onclick = function() {
        chrome.tabs.create({
            url: 'https://chrome.google.com/webstore/support/' + chrome.runtime.id + '#bug'
        });
    };

    $('manual').addEventListener('click', function() {
        chrome.tabs.create({
            'url': 'https://code.google.com/p/pyaxelws/wiki/Extension'
        });
    });

    $('product-version').innerText = chrome.runtime.getManifest().version;
});
