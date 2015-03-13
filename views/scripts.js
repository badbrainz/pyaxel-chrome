var filesystem = null;

var scripts_interface = {
    id: '',
    directory: '',
    current: '',
    dirty: -1,
    init: function(id, directory, default_script) {
        this.id = id;
        this.directory = directory;
        if (default_script)
            this.default_script = default_script;
        this.cm = CodeMirror(document.querySelector('#' + this.id + ' .source-code'), {
            indentUnit: 4,
            autoCloseBrackets: true,
            matchBrackets: true,
            commentBlankLines: true,
            extraKeys: {
                'Ctrl-/': 'toggleComment',
                'Ctrl-S': ui.saveScript.bind(null, this),
                'F11': onFullscreen.bind(null, this)
            }
        });
        var _this = this;
        filesystem.ls(this.directory, function(list) {
            for (var i = 0; i < list.length; i++)
                _this.add(list[i]);
            _this.sort();
            _this.load();
            _this.cm.on('change', function(cm, x) {
                var li = document.querySelector('#' + _this.id + 'scripts .scriptname.selected');
                if (li)
                    li.classList.toggle('dirty', _this.isDirty());
            });
        });
    },
    load: function(file_name, cursor) {
        if (file_name) {
            var _this = this;
            filesystem.read(this.directory + file_name, 'UTF-8', function(text) {
                if (text == null) return;
                _this.cm.setValue(text);
                _this.cm.focus();
                _this.cm.setCursor(cursor || {line: 0, ch: 0});
                _this.cm.clearHistory();
                _this.dirty = _this.cm.changeGeneration();
                _this.current = file_name;
                var li = document.querySelector('#' + _this.id + 'scripts .scriptname.selected');
                if (li)
                    li.classList.remove('dirty');
                var elms = _this.query('');
                for (var i = 0; i < elms.length; i++)
                    elms[i].classList.remove('selected');
                var index = _this.indexOf(_this.current) + 1;
                var elm = _this.query(':nth-child(' + index + ')');
                elm.classList.add('selected');
            });
        }
        else {
            var file = this.default_script || this.list()[0];
            if (file)
                this.load(file);
        }
    },
    save: function(callback) {
        if (this.current && this.isDirty()) {
            var _this = this;
            filesystem.write(this.directory + this.current, this.value(), function() {
                _this.dirty = _this.cm.changeGeneration();
                var li = document.querySelector('#' + _this.id + 'scripts .scriptname.selected');
                if (li)
                    li.classList.remove('dirty');
            });
        }
    },
    new: function(name, content, cursor) {
        var _this = this;
        filesystem.write(this.directory + name, content || '', function(err) {
            if (!err) {
                _this.add(name);
                _this.sort();
                _this.load(name, cursor);
            }
        });
    },
    add: function(name) {
        if (this.indexOf(name) != -1)
            return;
        var template = createTemplateElement();
        template.title = name.replace(/\.js$/, '');
        template.content = name;
        $(this.id + 'scripts').appendChild(template.element);
    },
    remove: function(file_name, load) {
        if (file_name) {
            if (file_name === this.default_script)
                return;
            var _this = this;
            filesystem.remove(this.directory + file_name, nop);
            var index = _this.indexOf(file_name) + 1;
            var elm = _this.query(':nth-child(' + index + ')');
            if (elm) {
//             if (index != -1) {
                elm.parentNode.removeChild(elm);
                if (elm.classList.contains('selected')) {
                    _this.current = '';
                    _this.cm.setValue('');
                    if (load)
                        _this.load();
                }
            }
        }
    },
    import: function(blobs) {
        var _this = this;
        var tasks = [];
        for (var i = 0; i < blobs.length; i++)
            tasks.push(blob_writer(this.directory, jsFileName(blobs[i].name), blobs[i]));
        process(tasks, this.add.bind(this), function() {
            _this.sort();
            _this.load(document.querySelector('#' + _this.id + 'scripts .scriptname.selected dd').innerText);
        });
    },
    indexOf: function(file_name) {
        var elms = this.list();
        return elms.indexOf(file_name);
    },
    query: function(selector) {
        var query = '#' + this.id + 'scripts .scriptname';
        if (!selector)
            return document.querySelectorAll(query);
        return document.querySelector(query + selector);
    },
    list: function() {
        var results = [];
        var elms = this.query('');
        for (var i = 0; i < elms.length; i++)
            results.push(elms[i].querySelector('dd').innerText);
        return results;
    },
    sort: function() {
        var sel = document.querySelector('#' + this.id + 'scripts .scriptname.selected dd');
        var elms = this.query('');
        var names = Array.prototype.map.call(elms, function(i) {
            return i.querySelector('dd').innerText;
        });
        names = names.filter(function(i) {
            return i !== this.default_script;
        }, this);
        names.sort(function(a, b) {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
        if (this.default_script)
            names.unshift(this.default_script);
        sel = sel ? sel.innerText : this.default_script || names[0];
        for (var i = 0; i < elms.length; i++) {
            elms[i].querySelector('dt').innerText = names[i].replace(/\.js$/, '');
            elms[i].querySelector('dd').innerText = names[i];
            elms[i].classList.remove('selected');
            if (names[i] == sel)
                elms[i].classList.add('selected');
        }
    },
    refresh: function() {
        this.cm.refresh();
    },
    isDirty: function() {
        return !this.cm.isClean(this.dirty);
    },
    value: function() {
        return this.cm.getValue();
    }
};

var scripts = {
    contentscripts: Object.create(scripts_interface),
    modulescripts: Object.create(scripts_interface)
};

var ui = {
    newScript: function(scr) {
        modal.show('input', function(input) {
            if (/^[\w\s_]+$/.test(input)) {
                var file_name = jsFileName(input.replace(/\s/g, '_'));
                if (scr.indexOf(file_name) == -1) {
                    if (scr === scripts.modulescripts)
                        scr.new(file_name, '{\n    \n}', {line: 1, ch: 4});
                    else
                        scr.new(file_name, '');
                }
            }
            else
                modal.show('info', 'Error', 'Bad file name');
        });
    },

    removeScripts: function(scr) {
        var list = scr.list();
        for (var i = 0; i < list.length; i++)
            scr.remove(list[i]);
        scr.load();
    },

    saveScript: function(scr) {
        scr.save(function(file_name) {
            // TODO stop using this
//             modal.show('info', "Saved " + (scr === scripts.modulescripts ? "module" : "script"), file_name);
        });
    },

    importScripts: function(scr) {
        var elm = document.querySelector('input[type=file]');
        elm.addEventListener('change', function onImport(e) {
            elm.removeEventListener('change', onImport, false);
            scr.import(e.target.files);
        }, false);
        elm.value = '';
        elm.click();
    }
};

function blob_writer(dir, name, blob) {
    return function(pass) {
        filesystem.write(dir + name, blob, function(err) {
            if (!err)
                pass(name);
            else
                pass();
        });
    }
}

function createTemplateElement() {
    var elm = template('script-name').cloneNode(true).querySelector('.scriptname');
    return {
        set title(str) {
            elm.querySelector('dt').innerText = str;
        },
        set content(str) {
            elm.querySelector('dd').innerText = str;
        },
        get element() {
            return elm;
        }
    };
}

function onScriptListEvent(e) {
    var scr = scripts[e.currentTarget.id];
    var file_name = e.relayTarget.querySelector('dd').innerText;
    if (e.target.classList.contains('delete')) {
        scr.remove(file_name, true);
        return false;
    }
    scr.load(file_name);
}

function onScriptControlEvent(e) {
    var scr = scripts[e.currentTarget.id + 'scripts'];
    if (e.relayTarget.classList.contains('new-button'))
        ui.newScript(scr);
    else if (e.relayTarget.classList.contains('remove-button'))
        ui.removeScripts(scr);
    else if (e.relayTarget.classList.contains('save-button'))
        ui.saveScript(scr);
    else if (e.relayTarget.classList.contains('import-button'))
        ui.importScripts(scr);
}

function onFullscreen(scr) {
    var root = document.querySelector('#' + scr.id);
    if (scr.container == null)
        scr.container = root.parentNode;
    var where = root.classList.contains('fullscreen') ? scr.container : document.body;
    where.appendChild(root);
    root.classList.toggle('fullscreen');
    scr.cm.refresh();
    scr.cm.focus();
}

function initEvents() {
    relayEvent('#contentscripts, #modulescripts', 'click', 'li', onScriptListEvent);
    relayEvent('#content, #module', 'click', 'button', onScriptControlEvent);
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getPlatformInfo(function(info) {
        document.body.classList.add('platform-' + info.os);
    });
    chrome.runtime.getBackgroundPage(function(bg) {
        filesystem = bg.exports.getFilesystem();
        initEvents();
        scripts.contentscripts.init('content', '', 'default.js');
        scripts.modulescripts.init('module', 'modules/');
    });
}, false);


window.addEventListener('message', function(e) {
    if (e.data.event == 'navigation')
        showPage(e.data.id);
    else if (e.data.event == 'navigationLoaded')
        postChildMessage('submenu', {event: 'changeSelection', id: 'content'});
});
