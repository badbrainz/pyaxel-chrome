{
    expand: function(str)
    {
        var meta = /([.*:;'"!@#$%^&?\-+=<>\\\/~`|(){}\[\]])/g
        var chars = /(\\[bcdfnrtvsw])/ig
        return str.split('*').map(function(i) {
            return i.replace(meta, '\\$1').replace(chars, '\\\\$1')
        }).join('(.*?)')
    },
    format: function() {
        var v = Array.prototype.slice.call(arguments, 1)
        return arguments[0].replace(/{(\d+)}/g, function(s, x) {
            return v[x]
        })
    },
    fill: function(str) {
        return str.replace(/[xX]/g, function(x) {
            return (Math.random() * 16|0).toString(16);
        })
    }
}
