function onMessage(e) {
    if (e.data.event == 'navigation')
        showPage(e.data.id, e.data.id + '.html');
    else if (e.data.event == 'navigationLoaded')
        postChildMessage('mainmenu', {event: 'changeSelection', id: 'settings'});
    else if (e.data.event == 'relayMessage')
        postChildMessage(e.data.target, e.data.message);
    else if (e.data.event == 'sendToBackground')
        $$('.navigation').classList.add('background');
    else if (e.data.event == 'sendToForeground')
        $$('.navigation').classList.remove('background');
}

document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('message', onMessage);
});
