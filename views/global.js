function $(i) {
    return document.getElementById(i);
}

function $q(s) {
    return document.querySelector(s);
}

function $x(s) {
    var n = $q('template.' + s);
    if (n)
        return n.content.cloneNode(true);
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

function getChildPosition(e) {
    var i = 0, el = e;
    while (el = el.previousElementSibling) i++;
    return i;
}
