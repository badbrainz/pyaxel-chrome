(function() {

function onClick(e) {
    var selected = e.currentTarget.querySelector('.selected');
    if (selected)
        selected.classList.remove('selected');

    e.relayTarget.classList.add('selected');

    var where = e.relayTarget.querySelector('button').value;
    postParentMessage({event: 'navigation', id: where});
}

function onMessage(e) {
    if (e.data.event == 'changeSelection')
        $q('button[value="' + e.data.id + '"]').click();
}

document.addEventListener('DOMContentLoaded', function() {
    relayEvent('.menu', 'click', 'li', onClick);
    postParentMessage({event: 'navigationLoaded'});
    window.addEventListener('message', onMessage);
});

})();
