{
    expand: function(str)
    {
        var meta = /([.*:;'"!@#$%^&?\-+=<>\\\/~`|(){}\[\]])/g
        var chars = /(\\[bcdfnrtvsw])/ig
        return str.split('*').map(function(i) {
            return i.replace(meta, '\\$1').replace(chars, '\\\\$1')
        }).join('(.*?)')
    }
}
