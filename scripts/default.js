/* usage: [command] [opts] [args]
     pyaxelws music
     pyaxelws music -q /podcast/live_2014_*
     pyaxelws -e mp3 -p /podcast/live_2014_*
   commands: audio, video, archive, document, software, music, movie
   opts: -e (--extension), -p (--pattern), -q (--queue)
*/

//#import strlib
//#import dllib

var command = args[0]
var pattern = new RegExp(strlib.expand(args[1] || opts.pattern || '*'))

var ext = {
    audio: 'mp3,aac,flac,wma,wav,pcm,ram,rm',
    video: 'mpg,mpeg,mp4,wmv,avi,flv',
    archive: 'zip,tar,bz2,tgz,gz,7z,rar',
    document: 'txt,pdf,doc,xml,docx,rtf,odt,wpd,xls,xlsx,ods,ppt',
    software: 'exe,dmg,iso,bin,cue,deb,rpm'
}

var tag = {
    audio: 'audio[src$="$1"]',
    video: 'video[src$="$1"]',
    anchor: 'a[href$="$1"]'
}

function selector(type, tags)
{
    return ext[type].replace(/([^,]+)/g, tag[tags || type])
}

function source(el)
{
    if (el.nodeName == 'AUDIO' || el.nodeName == 'VIDEO')
        return el.src
    return el.href
}

function filter(url)
{
    return pattern.test(url)
}

function query(cmd)
{
    if (cmd == "audio")
        return selector('audio')
    if (cmd == "video")
        return selector('video')
    if (cmd == "archive")
        return selector('archive', 'anchor')
    if (cmd == "document")
        return selector('document', 'anchor')
    if (cmd == "software")
        return selector('software', 'anchor')
    if (cmd == 'music')
        return [query("audio"), selector('audio', 'anchor')].join(',')
    if (cmd == "movie")
        return [query("video"), selector('video', 'anchor')].join(',')
    if (!cmd)
    {
        var q = opts.extension || [ext.audio, ext.video, ext.archive,
            ext.document, ext.software]
        return q.join(',').replace(/([^,]+)/g,
            [tag.audio, tag.video, tag.anchor].join(','))
    }
}

var q = query(command)
if (q)
{
    var result = document.querySelectorAll(q)
    result = Array.prototype.slice.call(result)
    result = result.map(source).filter(filter)
    var method = opts.queue ? dllib.queue : dllib.save
    for (var i = 0; i < result.length; i++)
        method({url: result[i]})
}
