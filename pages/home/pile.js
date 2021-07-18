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

let userRole = 'viewer';
function loadPile(role) {
    let pileRef = firebase.database().ref('/pile/'); //.limitToLast(???) ???
    userRole = role;

    //Initially add all the pile items/add a pile item each time it's added in real time to all clients
    pileRef.on('child_added', (data) => {
        $('.pile-area-empty').remove();
        if (role !== 'viewer') {
            $('.pile-controls').show();
            $('#no-item-add-btn').remove();
        }

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
    console.log(item)
    const historyHTML = item.history ? `
        <div id="pile-item-modal_${ id }" style="display: none;">
            ${ getHistoryHTML(item.history, id) }
        </div>
    `: `
    <div id="pile-item-modal_${ id }" style="display: none;">
        <div class="history-items">
            <h4 class="display-4 w-100 text-center mb-3">History</h4>
            <div class="no-history-items display-4">No history to show</div>
        </div>
    </div>
    `;

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
    
    ${ historyHTML }
    `;

    if (!alreadyExists) {
        $('#pile-items').prepend(itemHTML);
        $('#pile-area').animate({
            scrollTop: $('#pile-area').get(0).scrollHeight
        }, 0);
    } else {
        $(`#pile-item_${ id }`).replaceWith(itemHTML);
        let tempHist = $('div', $.parseHTML(historyHTML)).html() + '<button type="button" data-fancybox-close="" class="fancybox-button fancybox-close-small" title="Close"><svg xmlns="http://www.w3.org/2000/svg" version="1" viewBox="0 0 24 24"><path d="M13 12l5-5-1-1-5 5-5-5-1 1 5 5-5 5 1 1 5-5 5 5 1-1z"></path></svg></button>';
        $(`.fancybox-content#pile-item-modal_${ id }`).html(tempHist);
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

            <div class="pile-item-meta">
                ${ userRole !== 'viewer' ? `
                <div class="pile-item-btns mt-3">
                    <button type="button" class="delete-item-btn btn font-weight-bold btn-danger ml-2" onclick="deleteHistoryItem('${ id }', '${itemID }');">Delete</button>
                </div>
                ` : '' }
                <div class="pile-item-time text-muted d-flex justify-content-end">${ epochToDate(item.time) } at ${ epochToTime(item.time) }</div>
            </div>
        </div>
        ` + historyHTML;
    }

    return '<div class="history-items"><h4 class="display-4 w-100 text-center mb-3">History</h4>' + historyHTML + '</div>';
}

let formState = {
    state: '',
    name: '',
    desc: ''
};

function add() {
    formState = {
        state: 'add',
        name: '',
        desc: ''
    };

    $('#pile-form button[type=submit]').attr({
        'onclick': `pushAdd($('#pile-form').serializeArray());`,
        'disabled': 'disabled'
    }).html('Add');

    $('#pile-item-name-input').val('');
    $('#pile-item-desc-input').val('');

    $.fancybox.open({
        src: '#pile-modal',
        type: 'inline'
    });
}

function pushAdd(formData) {

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

    $.fancybox.close();
}

function edit(id) {
    formState = {
        state: 'edit',
        name: $(`#pile-item_${ id } .pile-item-name`).first().text(),
        desc: $(`#pile-item_${ id } .pile-item-desc`).first().text()
    };

    $('#pile-form button[type=submit]').attr({
        'onclick': `pushEdit('${ id }', $('#pile-form').serializeArray())`,
        'disabled': 'disabled'
        }).html('Update');

    $('#pile-item-name-input').val(formState.name);
    $('#pile-item-desc-input').val(formState.desc);

    $.fancybox.open({
        src: '#pile-modal',
        type: 'inline'
    });
}

function pushEdit(id, formData) {
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

    $.fancybox.close();
}

function validateForm() {
    let currentName = $(`#pile-item-name-input`).val();
    let currentDesc = $(`#pile-item-desc-input`).val();

    if (formState.state === 'add') {
        if (currentName !== '' && formState.desc !== currentDesc)
            $('#pile-form button[type=submit]').removeAttr('disabled');
        else
            $('#pile-form button[type=submit]').attr('disabled', 'disabled');

        return;
    }

    //Now if the form is in editing mode
    //Form only valid if name is not empty, and at least one field has been modified
    if (currentName !== '' && (currentName !== formState.name || currentDesc !== formState.desc))
        $('#pile-form button[type=submit]').removeAttr('disabled');
    else
        $('#pile-form button[type=submit]').attr('disabled', 'disabled');
    
}

function deleteSingle(id) {
    if (!confirm('Are you sure you want to delete this pile item?'))
        return;
    
    firebase.database().ref(`/pile/${ id }`).remove().catch( (error) => {
        alert(`You do not have permission to delete this item.`)
    });
}

function deleteHistoryItem(id, historyID) {
    if (!confirm('Are you sure you want to delete this history item?'))
        return; 

    firebase.database().ref(`/pile/${ id }/history/${ historyID }`).remove().catch( (error) => {
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