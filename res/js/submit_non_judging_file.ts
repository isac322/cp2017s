namespace SubmitHomework {
	const $confirmModal: JQuery = $('#confirmModal');
	const $confirmHeader: JQuery = $('#confirmModalLabel');
	const $confirmBody: JQuery = $('#confirmBody');
	const $confirmOK: JQuery = $('#confirmOK');


	$('.upload-form').validator().on('submit', function (e: JQueryEventObject) {
		if (e.isDefaultPrevented()) return;
		e.preventDefault();

		const $form: JQuery = $(e.target);
		const form = e.target as HTMLFormElement;
		const $sendBtn: JQuery = $form.find('button:last');
		const $selectBtn: JQuery = $form.find('.btn-file');
		const fileName = ($form.find('input:file')[0] as HTMLInputElement).files[0].name;
		const $listItem: JQuery = $form.find('li:first');

		$confirmHeader.html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' +
			' Submit <code>' + fileName + '</code>?');
		$confirmBody.html('Do you really want to submit <code>' + fileName + '</code>?<br>' +
			'<strong>If you have previously submitted, the last one will be overwritten.</strong>');

		$confirmOK.off('click');
		$confirmOK.click(() => {
			$sendBtn.button('loading');
			$selectBtn.addClass('disabled');

			$form.ajaxSubmit({
				statusCode: {
					202: () => {
						$sendBtn.button('reset');
						$selectBtn.removeClass('disabled');

						form.reset();
						$form.validator('validate');

						$listItem.addClass('list-group-item-success');
					},
					401: () => {
						document.location.href = '/';
					}
					// TODO: handling errors
				}
			});

			$confirmModal.modal('hide');
		});

		$confirmModal.modal('show');
	})
}