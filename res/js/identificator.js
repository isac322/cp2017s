var auth2;
gapi.load('auth2', function () {
    auth2 = gapi.auth2.init();
    if (next !== undefined)
        next();
});
function onSignIn(googleUser) {
    var id_token = googleUser.getAuthResponse().id_token;
    var xhr = new XMLHttpRequest();
    var btn = $('#login-btn').button('loading');
    xhr.open('POST', 'http://localhost:3000/signin');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        switch (xhr.status) {
            case 404:
                var res = JSON.parse(xhr.responseText);
                $('#register-modal').modal();
                $('#name-input').val(res.name);
                $('#id_token-input').val(res.idToken);
                break;
            case 202:
                document.location.href = '/homework';
                break;
            default:
                console.error(xhr.status);
        }
        btn.button('reset');
    };
    xhr.send('idtoken=' + id_token);
}
function signOut() {
    auth2.signOut().then(function () {
        console.log('User signed out.');
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:3000/signout');
        xhr.onload = function () {
            document.location.href = '/';
        };
        xhr.send();
    });
}
