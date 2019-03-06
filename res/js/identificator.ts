let auth2: any;

function startApp() {
	// @ts-ignore
	gapi.load('auth2', () => {
		// Retrieve the singleton for the GoogleAuth library and set up the client.
		// @ts-ignore
		auth2 = gapi.auth2.init();
		// @ts-ignore
		_wait_for_gapi_attached.forEach(attachSignIn);
	});
}

startApp();

function attachSignIn(element: HTMLElement) {
	auth2.attachClickHandler(element, {},
		onSignIn, (error: Error) => {
			alert(JSON.stringify(error, undefined, 2));
		}
	);
}

function onSignIn(googleUser: any) {
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