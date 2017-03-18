"use strict";

$('.upload-form').validator().on('submit', function (e) {
	if (!e.isDefaultPrevented()) {
		const $form = $(this);
		const form = this;
		const $sendBtn = $form.find('button:last');
		const $selectBtn = $form.find('.btn-file');
		const fileName = $form.find('input:file').get(0).files[0].name;
		const $rowLabel = $form.find('h4:first');

		e.preventDefault();
		bootbox.confirm({
			title: 'Submit <code>' + fileName + '</code>?',
			message: 'Do you really want to submit <code>' + fileName + '</code>?<br>If you have previously submitted, the last one will be overwritten.',
			buttons: {
				cancel: {
					label: '<i class="fa fa-times"></i> Cancel'
				},
				confirm: {
					label: '<i class="fa fa-check"></i> Submit'
				}
			},
			backdrop: true,
			callback: function (result) {
				if (result) {
					$sendBtn.button('loading');
					$selectBtn.addClass('disabled');

					$form.ajaxSubmit({
						statusCode: {
							202: function () {
								$sendBtn.button('reset');
								$selectBtn.removeClass('disabled');

								form.reset();
								$form.validator('validate');

								if (!$rowLabel.hasClass('text-success')) {
									$rowLabel.addClass('text-success');
								}
							},
							401: function () {
								document.location.href = '/';
							}
						}
					});
				}
			}
		});
	}
});