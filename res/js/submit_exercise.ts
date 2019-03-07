///<reference path="modal-result.ts"/>

namespace SubmitExercise {
	const $confirmModal: JQuery = $('#confirmModal');
	const $confirmHeader: JQuery = $('#confirmModalLabel');
	const $confirmBody: JQuery = $('#confirmBody');
	const $confirmOK: JQuery = $('#confirmOK');

	const resultModal = new ResultModal($('#resultModal'));

	$('.btn-judge').click((e: JQuery.ClickEvent) => {
		const $btn: JQuery<HTMLButtonElement> = $(e.target);

		$btn
			.addClass('disabled')
			.prop('disabled', true);

		const $form = $btn.closest('form');
		const $panel = $btn.closest('.panel');
		const $header = $panel.find('h4 strong');
		const title = $header.text();

		$confirmHeader.html(
			`<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Judge <code>${title}</code>?`);
		$confirmBody.html(
			`Do you really want to judge <code>${title}</code>?<br><strong>If you have succeeded at least once, failure will not affect your score.</strong>`);

		function resetButton() {
			$btn
				.removeClass('disabled')
				.prop('disabled', false);
		}

		$confirmModal
			.off('hide.bs.modal')
			.on('hide.bs.modal', resetButton);

		$confirmOK
			.off('click')
			.click(() => {
				$confirmModal.off('hide.bs.modal');

				$form.ajaxSubmit({
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

								$panel.removeClass();
								$panel.addClass('panel').addClass('panel-success');
								break;

							// incorrect
							case 406:
								resultModal.setIncorrect(res.input, res.answerOutput, res.userOutput);
								break;

							// timeout
							case 410:
								resultModal.setTimeout(res.input);
								break;

							// runtime error
							case 412:
								resultModal.setRuntimeError(res.returnCode, res.errorLog, res.input);
								break;

							// compile error
							case 400:
								resultModal.setCompileError(res.errorMsg);
								break;

							// fail to run
							case 417:
								resultModal.setFailToRun(res.errorMsg.replace('/\n/g', '<br>'));
								break;

							// server error
							case 500:
								resultModal.setServerError(
									`Some error occurs on the judging server. Please contact to web administrator with your error ID : <code>${res.id}</code>.`);
								break;

						}

						resetButton();

						$confirmModal.on('hide.bs.modal', resetButton);
					}
				});

				$confirmModal.modal('hide');
			});

		$confirmModal.modal('show');
	})
}