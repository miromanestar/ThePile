$(document).ready(function () {
    //loadDB();
});

//Simple helper function for me to upload files with, col is colleciton, file is file in the database folder
function uploadCollection(col, file) {
    $.getJSON(`${ window.location.origin }/database/${ file }`, function(data, msg) {
        $.each(data, function(key, val) {
            firebase.firestore().collection(col).doc(key).update({first_name: val.first_name, last_name: val.last_name }); //Use .set() to overwrite
        });
    });
}

function searchDB() {
    let searchInput = $('#db-search').val();
    $('.db-item').remove();
    $('.alert').remove();
    $('#db-loader').show();
    let canEdit = false;

    if (searchInput === '') {
        listDB();
        return;
    }

    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get().then(function(doc) {
        if (doc.exists && (doc.data().role === 'editor' || doc.data().role === 'owner'))
            canEdit = true;

            if (isNum(searchInput)) {
                firebase.firestore().collection('students').where('id', '==', searchInput).get().then(function(querySnapshot) {
                    querySnapshot.forEach(function(doc) {
                        last = doc;
                        appendItem(doc.id, doc.data(), canEdit);
                    });
                    if (querySnapshot.size == 0)
                        $('#db_list').append(`
                            <div class="text-center alert alert-warning">No matches using your search was found.<br />
                            Please note that at this time you may search only by first name, first and last name, or ID.</div>
                            `)
                });
            } else {
                let temp = searchInput.split(' ');
                for (let i = 0; i < temp.length; i++) { //Just capitalizing the first letter in each word in the search input
                    temp[i] = temp[i].substr(0, 1).toUpperCase() + temp[i].substr(1);
                }
                searchInput = temp.join(' ');

                //Match by full name or prefix of full name
                firebase.firestore().collection('students').where('name', '>=', searchInput).where('name', '<=', searchInput+ '\uf8ff').get().then(function(querySnapshot) {
                    querySnapshot.forEach(function(doc) {
                        last = doc;
                        appendItem(doc.id, doc.data(), canEdit);
                    });
                   
                   $('#db-loader').hide();
                   $('#load-more-btn').hide();
                });

                //Match by last name or prefix of last name
                firebase.firestore().collection('students').where('last_name', '>=', searchInput).where('last_name', '<=', searchInput+ '\uf8ff').get().then(function(querySnapshot) {
                    querySnapshot.forEach(function(doc) {
                        last = doc;
                        appendItem(doc.id, doc.data(), canEdit);
                    });
                    noResultFound();
                   
                   $('#db-loader').hide();
                   $('#load-more-btn').hide();
                });
            }
    });
}

function noResultFound() {
    if ($('#db_list .db-item').length === 0) {
        $('#db_list').append(`
            <div class="text-center alert alert-warning">No matches using your search was found.<br />
            Please note that at this time you may search only by first name, last name, or ID.</div>
            `);
    }
}

function isNum(num) {
    return !isNaN(num)
}

var last;
function loadMore() {
    let canEdit = false;
    $('#db-loader').show();
    $('#load-more-btn').hide();
    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get().then(function(doc) {
        if (doc.exists && (doc.data().role === 'editor' || doc.data().role === 'owner'))
            canEdit = true;
        
            firebase.firestore().collection('students').orderBy('name').startAfter(last).limit(20).get().then(function(querySnapshot) {
                querySnapshot.forEach(function(doc) {
                    last = doc;
                    appendItem(doc.id, doc.data(), canEdit);
                });
            
                $('#db-loader').hide();
                $('#load-more-btn').show();
            });
    });
}

function executeDB() {
    firebase.auth().onAuthStateChanged( function(user) {
        listDB();
    });
}

function listDB() {
    $('#load-more-btn').hide();
    $('.db-item').remove();
    $('.alert').remove();

    if (firebase.auth().currentUser === null) {
        $('#db_group').after(`<div class="text-center alert alert-danger">Uh oh! It appears you aren't authenticated! Please login!</div>`)
        $('#db_group').hide();
        return;
    }

    let canEdit = false;
    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get().then(function(doc) {
        if (doc.exists && (doc.data().role === 'editor' || doc.data().role === 'owner'))
            canEdit = true;
        
        firebase.firestore().collection('students').orderBy('name').limit(20).get().then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                last = doc;
                appendItem(doc.id, doc.data(), canEdit);
            });
            $('#db-loader').hide();
            $('#load-more-btn').show();
        });
    }).catch(function(error) {
        $('#db_group').after(`<div class="text-center alert alert-danger">
            ${ error }<br />
            Your account probably hasn't been granted read permissions. Contact the webmaster for more information.
            </div>`)
        $('#db_group').hide();
    });
}

function editProfile() {
    alert("Editing profiles is not yet supported!")
}

function appendItem(id, value, canEdit) {
    $('#db_list').append(`
        <a data-fancybox data-src="#db_lightbox_item_${ id }" class="db-item list-group-item list-group-item-dark list-group-item-action list-group-item-action d-flex justify-content-between align-items-center">
            ${ value.name } | ${ value.class }
            <span>${ id }</span>
        </a>
    `);

    $('#db_list_lightbox').append(`
        <div class="container emp-profile" id="db_lightbox_item_${ id }">
        <div class="row">
            <div class="col-md-4">
                <div data-src="${ value.picture }" data-fancybox data-caption="${value.name}" class="profile-img">
                    <img src="${ value.picture }" alt="${ value.name }"/>
                </div>
            </div>
            <div class="col-md-6">
                <div class="profile-head">
                            <h5>
                                ${ value.name }
                            </h5>
                            <h6>
                                ${ value.major } | ${ value.class }
                            </h6>
                            <p class="proile-rating">User ID: <span>${ id }</span></p>
                    <ul class="nav nav-tabs" id="myTab">
                        <li class="nav-item">
                            <a class="nav-link active" data-toggle="tab" href="#about_${ id }">About</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-toggle="tab" href="#other_${ id }">Other</a>
                        </li>
                    </ul>
                </div>
            </div>
            ${ canEdit ? `
            <div class="col-md-2">
                <input type="submit" onclick="editProfile(${ id })" class="profile-edit-btn" name="btnAddMore" value="Edit Profile"/>
            </div>
            ` : '' }
        </div>
        <div class="row">
            <div class="col-md-4">
                <div class="profile-work">
                    <p>Groups</p>
                        <li>${ value.groups.join('</li><li>') }
                </div>
            </div>
            <div class="col-md-8">
                <div class="tab-content profile-tab">
                    <div class="tab-pane fade show active" id="about_${ id }">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Email</label>
                                    </div>
                                    <div class="col-md-6">
                                        <a href="mailto:${ value.email }">${ value.email }</a>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>${ value.phone_type }</label>
                                    </div>
                                    <div class="col-md-6">
                                        <a href="tel:${ value.phone }">${ value.phone }</a>
                                    </div>
                                </div>
                                ${value.home_phone !== 'N/A' ? `
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Home Phone</label>
                                    </div>
                                    <div class="col-md-6">
                                        <p>${ value.home_phone }</p>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Addresses</label>
                                    </div>
                                    <div class="col-md-6">
                                        <p>${ value.addresses.join('<br />') }</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Gender & Status</label>
                                    </div>
                                    <div class="col-md-6">
                                        <p>${ value.gender } | ${ value.marital_status }</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Birthday</label>
                                    </div>
                                    <div class="col-md-6">
                                        <p>${ value.birthday }</p>
                                    </div>
                                </div>
                    </div>
                    <div class="tab-pane fade" id="other_${ id }">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Overall Standing</label>
                                    </div>
                                    <div class="col-md-6">
                                        <p>${ value.class_info.overall_standing }</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Latest Standing</label>
                                    </div>
                                    <div class="col-md-6">
                                        <p>${ value.class_info.latest_standing }</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>Track</label>
                                    </div>
                                    <div class="col-md-6">
                                        <p>${ value.class_info.track }</p>
                                    </div>
                                </div>
                    </div>
                </div>
            </div>
        </div>         
    </div>
    `);
}
