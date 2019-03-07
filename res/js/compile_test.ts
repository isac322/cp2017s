///<reference path="modal-result.ts"/>

namespace CompileTest {
	const resultModal = new ResultModal($('#resultModal'));

	$('.btn-judge').on('click', (e: JQuery.ClickEvent<HTMLButtonElement>) => {
		const $btn = $(e.target);

		$btn.addClass('disabled')
			.prop('disabled', true);

		$btn.closest('form').ajaxSubmit({
			complete: (jqXHR: JQueryXHR) => {
				const res = jqXHR.responseJSON;

				switch (jqXHR.status) {
					// dose not sign in yet
					case 401:
						document.location.href = '/';
						break;

					// correct
					case 200:
						resultModal.setCorrect();

						$btn.closest('.panel')
							.removeClass()
							.addClass('panel')
							.addClass('panel-success');
						break;

					// compile error
					case 400:
						resultModal.setCompileError(res.errorMsg);
						break;

					// server error
					case 500:
						resultModal.setServerError(
							`Some error occurs on the judging server. Please contact to web administrator with your error ID : <code>${res.id}</code>.`);
						break;

				}

				$btn
					.removeClass('disabled')
					.prop('disabled', false);
			}
		});
	})
}