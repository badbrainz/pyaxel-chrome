/* pyaxelws transfer codes */
var JobStatus = {
    QUEUED: 0,
    BAD_REQUEST: 100,
    FOUND: 200,
    PROCESSING: 201,
    COMPLETED: 202,
    CANCELLED: 203,
    STOPPED: 204,
    INVALID: 205,
    ERROR: 206,
    VERIFIED: 207,
    CLOSING: 208,
    RESERVED: 209,
    CONNECTING: 210
};

/* pyaxelws server commands */
var ServerCommand = {
    START: 0,
    STOP: 1,
    ABORT: 2,
    QUIT: 3
};

/* websocket readyState codes */
var WebSocketEvent = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
};

/* socket close frame codes */
var WebSocketStatus = {
    NORMAL: 1000,
    GOING_AWAY: 1001,
    PROTOCOL_ERROR: 1002,
    UNSUPPORTED: 1003,
    ABNORMAL: 1006,
    APPLICATION: 4999
};

function jsFileName(str) {
    return str.replace(/\.js$/, '') + '.js';
}

function prioritySort(nodeList, parent) {
    var sorted = Array.prototype.slice.call(nodeList);
    sorted = sorted.filter(function(elm) {
        return elm.parentNode === parent;
    });
    sorted.sort(function(a, b) {
        var x = a.attributes.getNamedItem('type').value;
        var y = b.attributes.getNamedItem('type').value;
        if (x === 'sha-256')return -1;
        if (y === 'sha-256')return 1;
        if (x === 'sha-1')return -1;
        if (y === 'sha-1')return 1;
        if (x === 'md5')return -1;
        if (y === 'md5')return 1;
        return 0;
    });
    return sorted;
}

function parseMetalinkXML(xml) {
    var ns = 'urn:ietf:params:xml:ns:metalink';
    var doc = xml.getElementsByTagNameNS(ns, 'metalink');
    if (!doc.length) {
        console.warn('invalid metalink file', xml.baseURI);
        return [];
    }

    var origin = doc[0].getElementsByTagNameNS(ns, 'origin');
    origin = origin[0] ? origin[0].textContent : doc[0].baseURI;

    var files = doc[0].getElementsByTagNameNS(ns, 'file');
    if (!files.length) {
        console.warn('invalid metalink file', xml.baseURI);
        return [];
    }

    var result = [];
    for (var f = 0; f < files.length; f++) {
        var file = files[f];

        var name = file.attributes.getNamedItem('name').value;
        if (!name)
            continue;

        var size = file.getElementsByTagNameNS(ns, 'size');
        if (!size.length)
            continue;
        size = +size[0].textContent;

        var mirrors = Array.prototype.slice.call(file.getElementsByTagNameNS(ns, 'url'));
        if (!mirrors.length)
            continue;
        for (var i = 0; i < mirrors.length; i++)
            mirrors[i] = mirrors[i].textContent;

        var metadata = {};

        var hashes = prioritySort(file.getElementsByTagNameNS(ns, 'hash'), file);
        for (var i = 0; i < hashes.length; i++) {
            if (hashes[i].attributes.getNamedItem('type').value.match(/^md5|sha-(?:1|256)$/)) {
                metadata.hash = {
                    type: hashes[i].attributes.getNamedItem('type').value.replace('-', ''),
                    checksum: hashes[i].textContent
                };
                break;
            }
        }

        var pieces = prioritySort(file.getElementsByTagNameNS(ns, 'pieces'), file);
        for (var i = 0; i < pieces.length; i++) {
            if (pieces[i].attributes.getNamedItem('type').value.match(/^md5|sha-(?:1|256)$/)) {
                var hash_list = pieces[i].getElementsByTagNameNS(ns, 'hash');
                if (!hash_list.length)
                    continue;
                if (Math.ceil(size / +pieces[i].attributes.getNamedItem('length').value) !== hash_list.length)
                    continue;
                metadata.pieces = {
                    type: pieces[i].attributes.getNamedItem('type').value.replace('-', ''),
                    length: +pieces[i].attributes.getNamedItem('length').value,
                    hashes: []
                };
                for (var j = 0; j < hash_list.length; j++)
                    metadata.pieces.hashes.push(hash_list[j].textContent);
                break;
            }
        }

        var info = {};
        info.name = name;
        info.url = mirrors;
        info.origin = origin;
        info.size = size;
        info.metadata = metadata;
        result.push(info);
    }
    return result;
}
