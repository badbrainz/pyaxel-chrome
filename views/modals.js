ext.define('extension.modal', function() {

var overlay = null;

var dialogs = {
    intro: function() {
        overlay.querySelector('.page').classList.add('intro');
        relayEvent(overlay, 'click', '.close-button', hideOverlay);
    },
    info: function(title, content) {
        overlay.querySelector('h1').innerText = title;
        overlay.querySelector('.content-area').innerText = content;
        overlay.querySelector('.cancel-button').autofocus = true;
    },
    notify: function(title, content, onWait, onCancel) {
        overlay.querySelector('h1').innerText = title;
        overlay.querySelector('.content-area .status').innerText = content;
        onWait({
            end: function(status, address) {
                overlay.querySelector('.content-area .status').innerText = status;
                overlay.querySelector('.content-area .address').innerText = address;
                var t = overlay.querySelector('.throbber');
                t.parentNode.removeChild(t);
            }
        });
        overlay.querySelector('.cancel-button').addEventListener('click', onCancel);
        overlay.querySelector('.cancel-button').autofocus = true;
    },
    input: function(response) {
        relayEvent(overlay, 'click', 'button', function(e) {
            if (e.target.classList.contains('okay-button')) {
                response(overlay.querySelector('input').value.trim());
                hideOverlay();
            }
        });
        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter a new file name';
        input.style.width = '100%';
        input.autofocus = true;
        input.addEventListener('keyup', function(e) {
            if (e.keyCode === 13)
                overlay.querySelector('button.okay-button').click();
            else if (e.keyCode === 27)
                overlay.querySelector('button.cancel-button').click();
        });
        overlay.querySelector('.content-area').appendChild(input);
        overlay.querySelector('h1').innerText = 'Add script';
    }
};

function showOverlay(type) {
    if (overlay)
        return;
    var temp = $x(type);
    if (!temp)
        return;
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.appendChild(temp.cloneNode(true));
    overlay.addEventListener('click', function(e) {
        if (overlay === e.target) {
            var page = overlay.querySelector('.page');
            page.classList.add('pulse');
            page.addEventListener('webkitAnimationEnd', function(e) {
                page.classList.remove('pulse');
            });
        }
    });
    relayEvent(overlay, 'click', '.cancel-button', hideOverlay);
    if (type in dialogs)
        dialogs[type].apply(null, Array.prototype.slice.call(arguments, 1));
    document.body.appendChild(overlay);
    var autofocus = overlay.querySelectorAll('[autofocus]');
    if (autofocus.length)
        autofocus[autofocus.length - 1].focus();
    postParentMessage({event: 'sendToBackground'});
}

function hideOverlay() {
    if (!overlay)
        return;
    overlay.classList.add('transparent');
    window.setTimeout(function() {
        if (!overlay)
            return;
        document.body.removeChild(overlay);
        overlay = null;
        postParentMessage({event: 'sendToForeground'});
    }, 250);
}

return {
    show: showOverlay,
    hide: hideOverlay
};

});
