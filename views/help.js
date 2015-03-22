document.addEventListener('DOMContentLoaded', function() {
    var manifest = chrome.runtime.getManifest();
    $('product-description').textContent = manifest.description;
    $('product-version').innerText = manifest.version;
});
