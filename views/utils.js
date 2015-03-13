function $(i) {return document.getElementById(i);}
function $$(s) {return document.querySelector(s);}

function template(s) {var n = $$('template.' + s);return n && n.content;}

function postParentMessage(msg) {
    window.parent.postMessage(msg, chrome.runtime.getURL(''));
}

function postChildMessage(iframeName, msg) {
    var iframe = $$('iframe[name=' + iframeName + ']');
    if (iframe)
        iframe.contentWindow.postMessage(msg, chrome.runtime.getURL(''));
}

function showPage(id, src) {
    var container = $(id);
    var selected = $$('.view > .selected');

    if (container === selected)
        return;

    if (src) {
        var iframe = container.querySelector('iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.name = getFilename(src);
            container.appendChild(iframe);
        }
    }

    if (selected)
        selected.classList.remove('selected');

    container.style.display = 'block';

    setTimeout(function() {
        container.classList.add('selected');
    }, 50);

    setTimeout(function() {
        var containers = document.querySelectorAll('.view > :not(.selected)');
        for (var i = 0; i < containers.length; i++)
            containers[i].style.display = 'none';
    }, 100);
}

function relayEvent(elm, evt, sel, fn, capt) {
    function callback(e) {
        var i = 0;
        var el;
        var target = e.target;
        var children = e.currentTarget.querySelectorAll(sel);
        while ((el = children[i++])) {
            if (el === target || el.contains(target)) {
                var ret = fn.call(el, {
                    target: target,
                    relayTarget: el,
                    currentTarget: e.currentTarget,
                    keyIdentifier: e.keyIdentifier,
                    keyCode: e.keyCode,
                    preventDefault: function() {e.preventDefault();},
                    stopPropagation: function() {e.stopPropagation();}
                });
                if (!ret)
                    e.preventDefault();
                return ret;
            }
        }
    }
    var elms = typeof elm === 'string' ? document.querySelectorAll(elm) : [elm];
    for (var i = 0; i < elms.length; i++)
        elms[i].addEventListener(evt, callback, !!capt);
}

function getFilename(s) {
    var path = chrome.runtime.getURL(s);
    return path.substr(path.lastIndexOf('/') + 1).replace(/\..*/, '');
}

function print(tpl, var_args) {
    var v = Array.prototype.slice.call(arguments, 1);
    return arguments[0].replace(/\{\d+\}/g, function(c) {
        return v[c.match(/\d+/)];
    });
}

function nop() {}

function process(a, b, c) {
    var f = Array.prototype.slice.call(a);
    var l = f.length;
    function p() { b.apply(b, arguments); --l == 0 && c && c(); }
    window.setTimeout(function() {
        l == 0 && c && c();
        while (f[0]) { f.shift()(p); }
    }, 0);
}
