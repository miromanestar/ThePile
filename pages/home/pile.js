firebase.auth().onAuthStateChanged( function(user) {
    $('.alert').remove(); //Remove all alert messages to remove potential duplicates

    //If the user is null, they can't do anything
    if (user === null) {
        $('#pile-area').hide();
        $('#pile-area').after(`<div class="text-center alert alert-danger">Uh oh! It appears you aren't authenticated! Please login!</div>`);
    }  else {

        //If the user can read from the user database, it means they're an authorized user
        firebase.database().ref(`/users/${ user.uid }`).once('value').then( (data) => {
            loadPile(data.val().role);
        }).catch( (error) => {
            $('#pile-area').hide();
            $('#pile-area').after(`
                <div class="text-center alert alert-danger">
                    ${ error }<br />
                    It appears you haven't been added as an authorized user. If you believe this is a mistake, please contact the webmaster.
                </div>
            `);
        });
    }
});

function loadPile(role) {
    let pileRef = firebase.database().ref('/pile/'); //.limitToLast(???) ???

    //Initially add all the pile items/add a pile item each time it's added in real time to all clients
    pileRef.on('child_added', (data) => {
        $('.pile-area-empty').remove();
        if (role !== 'viewer') {
            $('.pile-controls').show();
            $('#no-item-add-btn').remove();
        }
        console.log(data.val())
        displayItem(data.key, data.val());
    });

    $('#pile-loader').remove(); //Remove the load indicator

    //Display a message if no pile items could be retrieved/don't exist
    setTimeout(function() {
        noItems(role);
    }, 100);

    //Remove associated element if a pile item is deleted
    pileRef.on('child_removed', (data) => {
        $(`#pile-item_${ data.key }`).fadeOut('fast', function() { 
            $(this).remove();
            noItems(role); //If there are zero elements, display a message saying as such
        });
    });

    //Update associated element if it's entry changed in the database in real time
    pileRef.on('child_changed', (data) => {
        displayItem(data.key, data.val(), role, true);
        //Also implement something for edit history here
    });
}

//Will add/modify items from the pile in real time
function displayItem(id, item, role, alreadyExists) {
    const itemHTML = `
    <div id="pile-item_${ id }" class="pile-item">
        <div class="pile-item-content">
            <div class="pile-item-header">
                <div class="pile-item-name display-4">${ item.name }</div>
                <div class="pile-item-user text-muted mt-2">By ${ item.user }</div>
            </div>
            <div class="pile-item-desc mt-2">${ item.desc }</div>
        </div>

        <div class="pile-item-meta">
            ${ role !== 'viewer' ? `
            <div class="pile-item-btns mt-3">
                <button type="button" class="edit-item-btn btn font-weight-bold btn-primary ml-2" onclick="edit('${ id }');">Edit</button>
                ${ item.history ?
                `<button type="button" class="edit-item-btn btn font-weight-bold btn-primary ml-2" data-fancybox data-src="#pile-item-modal_${ id }">History</button>`
                : '' }
                <button type="button" class="delete-item-btn btn font-weight-bold btn-danger ml-2" onclick="deleteSingle('${ id }');">Delete</button>
            </div>
            ` : '' }
            <div class="pile-item-time text-muted d-flex justify-content-end"> ${ item.history ? '<span class="dot dot-warning mr-2"></span>' : '' }${ epochToDate(item.time) } at ${ epochToTime(item.time) }</div>
        </div>
    </div>

    ${ item.history ? `
    <div id="pile-item-modal_${ id }" style="display: none;">
    ${ getHistoryHTML(item.history, id) }
    </div>
    `: ''}`;

    if (!alreadyExists) {
        $('#pile-items').prepend(itemHTML);
        $('#pile-area').animate({
            scrollTop: $('#pile-area').get(0).scrollHeight
        }, 0);
    } else {
        $(`#pile-item_${ id }`).replaceWith(itemHTML);
    }
}

function getHistoryHTML(historys, id) {
    let historyHTML = '';

    for (let itemID in historys) {
        const item = historys[itemID]
        historyHTML = `
        <div class='history-item'>
            <div class="pile-item-header">
                <div class="pile-item-name display-4">${ item.name }</div>
                <div class="pile-item-user text-muted mt-2">By ${ item.user }</div>
            </div>
            <div class="pile-item-desc mt-2">${ item.desc }</div>
            <div class="pile-item-time text-muted d-flex justify-content-end mt-1"> ${ item.history ? '<span class="dot dot-warning mr-2"></span>' : '' }${ epochToDate(item.time) } at ${ epochToTime(item.time) }</div>
        </div>
        ` + historyHTML;
    }

    return historyHTML;
}

//To close the add/edit modal when escape key is pressed
document.addEventListener('keydown', ({key}) => {
    if (key === 'Escape')
        $('#pile-modal').fadeOut('fast');
})

function add() {
    $('#pile-form button[type=submit]').attr('onclick', `pushAdd($('#pile-form').serializeArray());`).html('Add');
    $('#pile-item-name-input').val('');
    $('#pile-item-desc-input').val('');
    $('#pile-modal').fadeIn('fast');
}

function pushAdd(formData) {
    $('#pile-modal').fadeOut('fast');

    firebase.database().ref(`/pile/`).push({
        'uid': firebase.auth().currentUser.uid,
        'user': firebase.auth().currentUser.displayName,
        'time': Date.now(),
        'order': $('.pile-item').length + 1,
        'name': formData[0].value,
        'desc': formData[1].value
    }).catch(function (error) {
        alert('You do not have permission to add items to the pile scrub.');
    });
}

function edit(id) {
    $('#pile-form button[type=submit]').attr('onclick', `pushEdit('${ id }', $('#pile-form').serializeArray())`).html('Update');
    $('#pile-item-name-input').val($(`#pile-item_${ id } .pile-item-name`).text());
    $('#pile-item-desc-input').val($(`#pile-item_${ id } .pile-item-desc`).text());
    $('#pile-modal').fadeIn('fast');
}

function pushEdit(id, formData) {
    $('#pile-modal').fadeOut('fast');

    firebase.database().ref(`/pile/${ id }`).once('value').then( (data) => {
        let item = data.val(); delete item.history;
        firebase.database().ref(`/pile/${ id }/history`).push(item); //Add current version to history of item
        firebase.database().ref(`/pile/${ id }`).update({
            'uid': firebase.auth().currentUser.uid,
            'user': firebase.auth().currentUser.displayName,
            'time': Date.now(),
            'name': formData[0].value,
            'desc': formData[1].value,
        });
    }).catch( (error) => {
        alert(`${error}\nCould not edit item. You probably don't have permission.`)
    });
}

function deleteSingle(id) {
    if (!confirm('Are you sure you want to delete this item?'))
        return;
    
    firebase.database().ref(`/pile/${ id }`).remove().catch( (error) => {
        alert(`You do not have permission to delete this item.`)
    });
}

function reorder() {
    alert('Not yet implemented');
}

function noItems(role) {
    if ($('.pile-item').length === 0) {
        $('.pile-controls').hide();
        $('#pile-area').append(`
            <div class="pile-area-empty py-3 text-muted text-center">
            Looks like there isn't anything on the pile!
            <br />
            Add something you pink kebab-horned sea unicorn!</div>
        `);
        
        if (role != 'viewer')
            $('#pile-area').append(`
                <button type="button" id="no-item-add-btn" class="btn btn-primary font-weight-bold mx-auto d-block" onclick="add();">Add</button>
            `);
    }
}

function epochToTime(s) {
    date = new Date(s);

    minute = date.getMinutes();
    hour = date.getHours();

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

    return `${ hour }:${ minute } ${ AMPM }`;
}

function epochToDate(s) {
    date = new Date(s);
    year = date.getFullYear();
    month = date.toLocaleString('default', { month: 'long' });
    day = date.getDate();

    return `${ month } ${ day }, ${ year }`;
}