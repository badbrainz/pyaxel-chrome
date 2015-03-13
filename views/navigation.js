(function() {

function onClick(e) {
    var selected = e.currentTarget.querySelector('.selected');
    if (selected)
        selected.classList.remove('selected');

    e.relayTarget.classList.add('selected');

    var where = e.relayTarget.querySelector('button').value;
    window.postParentMessage({event: 'navigation', id: where});
}

function onMessage(e) {
    if (e.data.event == 'changeSelection')
        $$('button[value="' + e.data.id + '"]').click();
}

document.addEventListener('DOMContentLoaded', function() {
    window.relayEvent('.menu', 'click', 'li', onClick);
    window.postParentMessage({event: 'navigationLoaded'});
    window.addEventListener('message', onMessage);
});

})();
