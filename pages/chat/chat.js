firebase.auth().onAuthStateChanged( function(user) {
    if (firebase.auth().currentUser === null) {
        $('#chat-area').after(`<div class="text-center alert alert-danger">Uh oh! It appears you aren't authenticated! Please login!</div>`);
        $('#chat-area').hide();
    } else {
        firebase.database().ref(`/public_chat/`).once('value').then( (chats) => {
            var chatRef = firebase.database().ref('/public_chat/').limitToLast(100);
            
            //If message added
            let tempDate = 0;
            chatRef.on('child_added', (data) => {
                $('.chat-message-empty').remove();
                if (tempDate === 0 || Math.abs(tempDate - data.val().time) > 3600000) { //If last text was more than 1 hour ago
                    $('#chat-message-area').append(`
                    <div class="chat-message-dates py-3 text-muted text-center">${ epochToDate(data.val().time) } at ${ epochToTime(data.val().time) }</div>
                    `);
                    tempDate = data.val().time;
                }
                
                displayChat(data.key, data.val(), $(`#chat-message_${ data.key }`).length !== 0);
            });
            
            //Remove loading spinner
            $('#chat-loader').remove();

            setTimeout(function() {
                if ($('.chat-message').length === 0)
                    $('#chat-message-area').append(`
                    <div class="chat-message-empty py-3 text-muted text-center">Looks like there aren't any chat messages! Be the first!</div>
                    `);
            }, 100);
            
            //If message deleted
            chatRef.on('child_removed', (data) => {
                $(`#chat-message_${ data.key }`).remove();
                $(`#chat-lightbox_${ data.key }`).remove();

                if ($('.chat-message').length === 0)
                    $('#chat-message-area').append(`
                    <div class="chat-message-empty py-3 text-muted text-center">Looks like there aren't any chat messages! Be the first!</div>
                    `);
                
                $('.chat-message-dates').each(function(index) {
                    if (!$(this).next().hasClass('chat-message')) {
                        $(this).remove();
                    }
                });
            });

            chatRef.on('child_changed', (data) => {
                displayChat(data.key, data.val(), true);
            });
        }).catch(function (error) {
            $('#chat-area').after(`<div class="text-center alert alert-danger">This account has not been granted chat permissions.</div>`);
            $('#chat-area').hide();
        });
    }
});

//https://codepen.io/sajadhsm/pen/odaBdd

function displayChat(id, chat, alreadyExists) {
    id = sanitizeString(htmlDecode(id));

    for (let item in chat)
        if (typeof item === 'string' && $.isNumeric(chat[item]) === false)
            chat[item] = sanitizeString(htmlDecode(chat[item]));

    let isOwnMsg = 'chat-message-left';
    let fancybox = '';
    if (chat.uid === firebase.auth().currentUser.uid) {
        isOwnMsg = 'chat-message-right';

        if (chat.status !== 'deleted')
            fancybox = `data-fancybox data-src="#chat-lightbox_${ id }"`;
    }
    
    if (chat.status === 'deleted')
        chat.message = `<i style="color: lightsteelblue;">Deleted</i>`;

    const chatItem = `
    <div class="chat-message ${ isOwnMsg }" id="chat-message_${ id }">
        <div class="chat-message-image" style="background-image: url(${ chat.photo });"></div>
        <div class="chat-message-bubble" ${ fancybox }>
            <div class="chat-message-info">
                <div class="chat-message-name">${ chat.name }</div>
                <div class="chat-message-time">${ epochToTime(chat.time) }</div>
            </div>
            <div class="chat-message-text">${ chat.message }</div>
        </div>
    </div>
    `;

    const chatLightbox = `
    <div id="chat-lightbox_${ id }" class="chat-message ${ isOwnMsg }">
        <div class="chat-message-image" style="background-image: url(${ chat.photo });"></div>
        <div class="chat-message-bubble">
            <div class="chat-message-info">
                <div class="chat-message-name">${ chat.name }</div>
                <div class="chat-message-time">${ epochToTime(chat.time) }</div>
            </div>
            <div class="chat-message-text">${ chat.message }</div>
            <div class="message-id" style="display: none;">${ id }</div>
        </div>
        <div class="chat-message-btns text-center">
            <button type="button" class="btn btn-danger w-100 mt-3" onclick="softDelete('${ id }')">Delete</button>
        </div>
    </div>
    `;

    if (!alreadyExists) {
        if (fancybox !== '')
            $('#chat-lightboxes').append(chatLightbox);

        $('#chat-message-area').append(chatItem);
        $('#chat-message-area').animate({
            scrollTop: $('#chat-message-area').get(0).scrollHeight
        }, 0);
    } else {
        $(`#chat-message_${ id }`).replaceWith(chatItem);
        $(`#chat-lightbox_${ id }`).replaceWith(chatLightbox);
    }
}

function deleteMsg(id) {
    if (!confirm('Are you sure you want to delete this chat?'))
        return;
    
    firebase.database().ref(`/public_chat/${ id }`).remove().catch( function(error) {
        alert('You do not have permission to delete this message.');
        console.error(error);
    });

    $.fancybox.close();
}

function softDelete(id) {
    if (!confirm('Are you sure you want to delete this message?'))
        return;

    firebase.database().ref(`/public_chat/${ id }`).update(
        {
            'message': '[deleted]', 
            'status': 'deleted',
            'modified': Date.now()
        }
    ).catch( function(error) {
        alert('You do not have permission to delete this message.');
        console.error(error);
    });

    $.fancybox.close();
}

function pushChat(message) {
    $('#chat-input').val('');

    firebase.database().ref('/public_chat/').push({
        'uid': firebase.auth().currentUser.uid,
        'name': firebase.auth().currentUser.displayName,
        'time': Date.now(),
        'message': sanitizeString(message),
        'photo': firebase.auth().currentUser.photoURL,
        'status': 'public',
        'modified': Date.now()
    }).catch(function (error) {
        alert('You do not have permission to send chats.');
    });
}

function epochToTime(s) {
    let date = new Date(s);

    let minute = date.getMinutes();
    let hour = date.getHours();

    let AMPM = '';
    if (hour === 0) {
        hour = 12;
        AMPM = 'AM';
    } else if (hour < 12) {
        AMPM = 'AM';
    } else if (hour >= 12) {
        if (hour !== 12)
            hour = hour - 12;
        AMPM = 'PM';
    }

    if (minute < 10)
        minute = '0' + minute;

    return `${ hour }:${ minute } ${ AMPM }`
}

function epochToDate(s) {
    let date = new Date(s);
    let year = date.getFullYear();
    let month = date.toLocaleString('default', { month: 'long' });
    let day = date.getDate();

    return `${ month } ${ day }, ${ year }`;
}

function sanitizeString(string) {
    if (typeof string !== 'string')
        return string;
    
    var re = /[><&"']/g;

    return string.replace(re, function(match, tag, char) {
        char = char.charAt(tag);
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return '';
        }
    });
}

function htmlDecode(input) {
    let doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
  }