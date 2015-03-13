#!/bin/bash

# packer used: Google Chrome
# compressor used: Google Closure Compiler
# https://developers.google.com/closure/compiler/

clear

revision=`hg parent --template '/* revision {node} */'`

builddir=build
tempdir=`mktemp -d`

chromiumbin=`which google-chrome`
compiler=`which compiler.jar`

packext=0
clean=0
debug=0
run=0

ccflags=("--language_in ECMASCRIPT5" "--warning_level VERBOSE")
ccflags+=("--jscomp_warning visibility" "--jscomp_error missingProperties")
ccflags+=("--externs extern/*.js")

crflags=("--pack-extension=$builddir")
if [ -e $builddir.pem ]; then
    crflags+=("--pack-extension-key=$builddir.pem")
fi

background=(core.js utils.js preferences.js indicator.js storage.js sync.js)
background+=(filesystem.js script.js catalog.js manager.js history.js socket.js task.js main.js)
background=( ${background[@]/#/background/} )
resources=(graph scripts views background/global.js)

isDirty() {
    return `hg st ${!1} | grep -q .`
}

concatScripts() {
    echo
    echo "compiling $2: ${!1}"
    if ! isDirty ${!1}; then
        echo "$revision" > $2
    fi
    for i in ${!1}; do
        cat $i >> $2
    done
}

optimizeScripts() {
    echo
    echo "compiling $2: ${!1}"
    if ! isDirty ${!1}; then
        echo "$revision" > $2
    fi
    echo `java -jar $compiler ${ccflags[@]} --js ${!1}` >> $2
}

linkResources() {
    echo
    echo "linking: "${!1}
    for i in ${!1}; do
        ln -s $(readlink -f $i) $2
    done
}

writeManifest() {
    echo
    echo "copying manifest"
    cp manifest.json $1
}

packExtension() {
    echo "packing extension..."
    if [ -x $chromiumbin ]; then
        $chromiumbin ${crflags[@]} $1
    fi
    (cd $1 && zip -r --filesync ../$1.zip .)
}

runExtension() {
    local usrdatadir=`mktemp -d`
    $chromiumbin --user-data-dir=$usrdatadir --no-first-run --load-extension=$1
    cleanup $usrdatadir
}

init() {
    if [ -d $1 ]; then
        rm -rf $1
    fi
}

cleanup() {
    rm -rf $1
}

while [ $# -gt 0 ]; do
    case "$1" in
        pack )
            packext=1
            ;;
        clean )
            clean=1
            ;;
        debug )
            debug=1
            ccflags+=("--define DEBUG=false")
            ccflags+=("--compilation_level ADVANCED_OPTIMIZATIONS")
            ;;
        run )
            run=1
            ;;
        * )
            ;;
    esac
    shift
done

init $builddir
if [ $clean -eq 1 ]; then
    exit 0
fi

if [ $debug -eq 1 ]; then
    concatScripts background[@] $tempdir/background.js
else
    concatScripts background[@] $tempdir/background.js
fi

linkResources resources[@] $tempdir

writeManifest $tempdir

cp -rL $tempdir $builddir

cleanup $tempdir

if [ $packext -eq 1 ]; then
    packExtension $builddir
fi

if [ $run -eq 1 ]; then
    runExtension $builddir
fi
