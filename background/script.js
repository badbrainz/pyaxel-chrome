ext.define('extension.script', function() {

var utils = extension.utils;
var filesystem = extension.filesystem;

var directory = 'userscripts/';
var schema = [
    ['s', 'script', ':', 'javascript file'],
    ['p', 'pattern', ':', 'url pattern'],
    ['q', 'queue', '', 'queue download'],
    ['r', 'recursive', '', 'search recursively'],
    ['e', 'extension', ':+', 'file extension'],
    ['a', 'allframes', '', 'all frames'],
    ['c', 'configure', '', 'configure download']
];

function getDependencies(code) {
    var result = [];
    var names = String(code).match(/^[\t ]*\/{2}#import\s+[\w ]+$/gm) || [];

    for (var i = 0; i < names.length; i++) {
        var s = names[i].trim().split(/\s+/);
        s.shift();
        result = result.concat(s);
    }

    result = result.filter(function(e, i) {
        return result.indexOf(e) == i;
    });

    return result;
}

function compile(js, opts, args, callback) {
    var compiled = {};

    function load_dependency(name) {
        return function(pass) {
            filesystem.read(utils.jsname('modules/' + name), 'UTF-8', function(src) {
                pass(name, src);
            });
        }
    }

    function compile_dependencies(names, callback) {
        var mdeps = [];

        function pass(name, src) {
            if (name in compiled)
                return;

            console.assert(src != null, 'compile error: unknown module:', name);
            compiled[name] = src;

            mdeps = getDependencies(src).concat(mdeps);
        }

        function join() {
            mdeps = mdeps.filter(function(e) {
                return !(e in compiled);
            });

            if (mdeps.length) {
                compile_dependencies(mdeps, function(imported) {
                    callback(utils.copy(compiled, imported));
                });
            }
            else
                callback(compiled);
        }

        utils.process(names.map(load_dependency), pass, join);
    }

    function build(obj) {
        var result = [];

        result.push('!function (opts, args) {');
        result.push('var __main__ = Object.create(null);');

        var keys = Object.keys(obj);
        var i = keys.length;
        while (i--)
            result.push('var ' + keys[i] + '=' + obj[keys[i]] + ';');

        result.push('Object.freeze(__main__);');
        result.push('with (__main__) {');
        result.push(js);
        result.push('}');
        result.push('}(' + JSON.stringify(opts) + ',' + JSON.stringify(args) + ');');
        result.push('//# sourceURL=injected');

        callback(result.join('\n'));
    }

    compile_dependencies(getDependencies(js), build);
}

function installScripts(dir, items, callback) {
    var path = dir || 'scripts/';
    utils.iterate(items, function(i, next) {
        var name = utils.jsname(i);
        var req = new XMLHttpRequest();
        req.responseType = 'text';
        req.timeout = 10000;
        req.onload = function() {
            if (req.readyState === XMLHttpRequest.DONE) {
                if (req.status === 200)
                    filesystem.write(path + name, req.response, next);
                else
                    next();
            }
        };
        req.onerror = req.ontimeout = next;
        req.open('GET', directory + name, true);
        req.send();
    });
}

function makeScript(params, callback) {
    filesystem.read(utils.jsname(params.opts['script'] || 'default.js'), 'UTF-8',
        function(data) {
            if (data != null)
                compile(data, params.opts, params.args, callback);
        }
    );
}

function parseScript(input) {
    var opts = {};
    var args = [];
    var argv = (function(s) {
        var tokens = [], argv = s.split(' ');
        while (argv[0]) {
            var a = argv.shift();
            if (/^-[a-z]+$/i.test(a))
                tokens = tokens.concat(a.split('').join(',-').split(',').slice(1));
            else
                tokens.push(a);
        }
        return tokens;
    })(input);

    function option(s) {
        for (var i = 0; i < schema.length; i++)
            if (schema[i][0] == s || schema[i][1] == s)
                return schema[i];
    }

    while (argv[0]) {
        var arg = argv.shift();
        if (/^-(-|[a-z]$)/.test(arg)) {
            var o = option(arg.slice(/^-[a-z]$/i.test(arg) ? 1 : 2));
            if (!o) return;
            if (o[2].indexOf(':') != -1) {
                if (o[2].indexOf('+') != -1) {
                    opts[o[1]] = opts[o[1]] || [];
                    while (argv[0] && !/^--?/.test(argv[0])) {
                        opts[o[1]].push(argv.shift());
                    }
                }
                else {
                    if (argv[0] && !/^--?/.test(argv[0]))
                        opts[o[1]] = argv.shift();
                }
                if (opts[o[1]] == null || opts[o[1]].length == 0)
                    return;
                continue;
            }

            opts[o[1]] = true;
            continue;
        }
        args.push(arg);
    }

    return {opts: opts, args: args};
}

return {
    install: installScripts,
    make: makeScript,
    parse: parseScript
};

});
