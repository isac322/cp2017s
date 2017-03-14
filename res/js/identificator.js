var auth2;
gapi.load('auth2', function () {
    auth2 = gapi.auth2.init();
    if (next !== undefined)
        next();
});
function onSignIn(googleUser) {
    var name = googleUser.getBasicProfile().getName();
    var id_token = googleUser.getAuthResponse().id_token;
    var xhr = new XMLHttpRequest();
    var btn = $('#login-btn').button('loading');
    xhr.open('POST', 'https://cp2017s.snu.ac.kr/signin');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        switch (xhr.status) {
            case 404:
                $('#register-modal').modal();
                $('#name-input').val(name);
                $('#id_token-input').val(id_token);
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
        xhr.open('POST', 'https://cp2017s.snu.ac.kr/signout');
        xhr.onload = function () {
            document.location.href = '/';
        };
        xhr.send();
    });
}
