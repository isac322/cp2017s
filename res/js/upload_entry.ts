namespace UploadEntry {
	const $confirmModal: JQuery = $('#confirmModal');
	const $confirmHeader: JQuery = $('#confirmModalLabel');
	const $confirmBody: JQuery = $('#confirmBody');
	const $confirmOK: JQuery = $('#confirmOK');

	$('.upload-form').validator().on('submit', (e: JQuery.SubmitEvent<HTMLFormElement>) => {
		if (e.isDefaultPrevented()) return;
		e.preventDefault();

		const $form: JQuery<HTMLFormElement> = $(e.target);
		const form: HTMLFormElement = e.target;
		const $selectBtn: JQuery = $form.find('.btn-file');
		const $inputFile = $selectBtn.find('input:file') as JQuery<HTMLInputElement>;
		const fileName = $inputFile[0].files[0].name;
		const $listItem: JQuery = $form.closest('li');

		$confirmHeader.html(
			`<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Submit <code>${fileName}</code>?`);
		$confirmBody.html(
			`Do you really want to submit <code>${fileName}</code>?<br><strong>If you have previously submitted, the last one will be overwritten.</strong>`);

		function resetForm() {
			$selectBtn.removeClass('disabled');
			$inputFile.prop('disabled', false);

			form.reset();
			$form.validator('validate');
		}

		$confirmModal
			.off('hide.bs.modal')
			.on('hide.bs.modal', resetForm);

		$confirmOK
			.off('click')
			.click(() => {
				$confirmModal.off('hide.bs.modal');
				$inputFile.prop('disabled', true);

				$form.ajaxSubmit({
					statusCode: {
						202: () => {
							resetForm();

							$listItem.addClass('list-group-item-success');

							$confirmModal.on('hide.bs.modal', resetForm);
						},
						401: () => document.location.href = '/'
						// TODO: handling errors
					}
				});

				$confirmModal.modal('hide');
			});

		$confirmModal.modal('show');
	});


	$('.upload-entry').on('change', (e: JQuery.ChangeEvent<HTMLInputElement>) => {
		const input = e.target;
		input.setAttribute('disabled', '');

		const fileName = input.files[0].name;

		const $form = $(input).closest('form');
		$form.find('input.form-control:text').val(fileName);
		$form.find('.btn-file').addClass('disabled');
		$form.submit();
	});
}