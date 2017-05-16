"use strict";
let auth2;
var gapi;
gapi.load('auth2', () => {
    auth2 = gapi.auth2.init();
    if ('next' in window)
        next();
    if ('next2' in window)
        next2();
});
function onSignIn(googleUser) {
    const name = googleUser.getBasicProfile().getName();
    const id_token = googleUser.getAuthResponse().id_token;
    const xhr = new XMLHttpRequest();
    const btn = $('#login-btn').button('loading');
    xhr.open('POST', 'signin');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = () => {
        switch (xhr.status) {
            case 204:
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
    auth2.signOut().then(() => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'signout');
        xhr.onload = function () {
            document.location.href = '/';
        };
        xhr.send();
    });
}
