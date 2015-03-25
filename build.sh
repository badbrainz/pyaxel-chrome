#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
#set -o xtrace

revision=`hg parent --template '{node}'`

dir_build="release"
dir_data=".data"
dir_temp="${dir_data}/temp"
dir_profile="${dir_data}/profile"

bin_chromium=$(type -p google-chrome)

pack_ext=0
clean_dir=0
run_ext=0

flags_ct=("--no-first-run" "--prerender=enabled")
flags_cr=("--pack-extension=${dir_build}")
if [ -e "${dir_build}.pem" ]; then
    flags_cr+=("--pack-extension-key=${dir_build}.pem")
fi

files_ext=(ext/ext.js
           ext/messages.js)

files_src=(lib/*
           views/*
           graph/
           scripts/
           ext/utils.js
           ext/string.js
           background/defines.js)

files_background=(background/utils.js
                  background/preferences.js
                  background/indicator.js
                  background/storage.js
                  background/filesystem.js
                  background/script.js
                  background/catalog.js
                  background/manager.js
                  background/history.js
                  background/socket.js
                  background/task.js
                  background/main.js)

# source config
if [ -f conf ]; then
    . conf
fi

isdirty() {
    return `hg st -mard $1 | grep -q .`
}

addrevision () {
    echo "adding revision number"
    echo $1 > $2/REVISION
}

compilescripts() {
    echo "compiling $2:"
    if [ -e $2 ]; then
        echo "overwriting $2!"
    fi
    for i in ${!1}; do
        echo -e "\t$i"
        cat $i >> $2
    done
}

linkresources() {
    echo "linking:"
    for i in ${!1}; do
        echo -e "\t$i"
        ln -s $(readlink -f $i) $2
    done
}

writemanifest() {
    echo "writing manifest"
    cp manifest.json $1
}

buildextension() {
    echo "building extension"
    cp -rL $1 $2
}

packextension() {
    echo "packing extension..."
    if [ "${bin_chromium}" ]; then
        "${bin_chromium}" ${flags_cr[@]} $1
    fi
    (cd $1 && zip -vr --filesync ../$1.zip .)
    echo "-------"
    du -b $1.zip
    zip -T $1.zip
}

runextension() {
    if [ "${bin_chromium}" ]; then
        echo "running extension..."
        "${bin_chromium}" ${flags_ct[@]} --load-extension="$1" --user-data-dir="$2"
    fi
}

initdir() {
    echo "initializing $1/"
    mkdir -p $1
    rm -rf $1/*
}

cleanup() {
    echo "removing $1/"
    rm -rf $1
}

while [ $# -gt 0 ]; do
    case "$1" in
         pack ) pack_ext=1;;
        clean ) clean_dir=1;;
          run ) run_ext=1;;
            * ) ;;
    esac
    shift
done

cleanup ${dir_build}
if [ ${clean_dir} -eq 1 ]; then
    cleanup ${dir_data}
    exit 0
fi

initdir ${dir_temp}
compilescripts files_ext[@] ${dir_temp}/ext.js
compilescripts files_background[@] ${dir_temp}/background.js
linkresources files_src[@] ${dir_temp}
writemanifest ${dir_temp}
buildextension ${dir_temp} ${dir_build}

if ! isdirty "."; then
    addrevision "${revision}" ${dir_build}
fi

if [ ${pack_ext} -eq 1 ]; then
    packextension ${dir_build}
fi

if [ ${run_ext} -eq 1 ]; then
    runextension ${dir_build} ${dir_profile}
fi

exit 0
