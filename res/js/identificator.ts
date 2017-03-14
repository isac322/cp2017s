let auth2;

gapi.load('auth2', () => {
	auth2 = gapi.auth2.init();
	if (next !== undefined)
		next();
});

function onSignIn(googleUser: any) {
	const name = googleUser.getBasicProfile().getName();
	const id_token = googleUser.getAuthResponse().id_token;
	const xhr = new XMLHttpRequest();
	const btn = $('#login-btn').button('loading');

	xhr.open('POST', 'http://localhost/signin');
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.onload = () => {
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
		const xhr = new XMLHttpRequest();
		xhr.open('POST', 'http://localhost/signout');
		xhr.onload = function () {
			document.location.href = '/';
		};
		xhr.send();
	});
}