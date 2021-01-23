firebase.auth().onAuthStateChanged( function(user) {
    $('.alert').remove(); //Remove all alert messages to remove potential duplicates

    //If the user is null, they can't do anything
    if (user === null) {
        $('#pile-area').hide();
        $('#pile-area').after(`<div class="text-center alert alert-danger">Uh oh! It appears you aren't authenticated! Please login!</div>`);
    }  else {

        //If the user can read from the user database, it means they're an authorized user
        firebase.database().ref(`/users/${ user.uid }`).once('value').then( (data) => {
            if (data.val().role !== 'viewer')
                $('.pile-controls').show();
            loadPile();
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

function loadPile() {
    let pileRef = firebase.database().ref('/pile/'); //.limitToLast(???) ???

    //Initially add all the pile items/add a pile item each time it's added in real time to all clients
    pileRef.on('child_added', (data) => {
        $('pile-area-empty').remove();
    });

    $('#pile-loader').hide(); //Remove the load indicator

    //Display a message if no pile items could be retrieved/don't exist
    setTimeout(function() {
        noItems();
    }, 100);

    //Remove associated element if a pile item is deleted
    pileRef.on('child_removed', (data) => {


        noItems(); //If there are zero elements, display a message saying as such
    });

    //Update associated element if it's entry changed in the database in real time
    pileRef.on('child_changed', (data) => {

    });
}

function noItems() {
    if ($('.pile-item').length === 0)
        $('#pile-area').append(`
            <div class="pile-area-empty py-3 text-muted text-center">
            Looks like there isn't anything on the pile!
            <br />
            Add something you pink kebab-horned sea unicorn!</div>
        `); 
}

function add() {
    alert('Not implemented');
}

function edit() {
    alert('Not implemented');
}