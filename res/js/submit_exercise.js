"use strict";

const $resultModal = $('#resultModal');
const $resultModalHeader = $('#resultModalLabel');
const $correctBody = $('#correctBody');
const $incorrectBody = $('#incorrectBody');
const $errorBody = $('#errorBody');

const $inputBox = $('#inputBox');
const $outputBox = $('#outputBox');
const $answerBox = $('#answerBox');

const $errorBox = $('#errorBox');

$('.upload-form').validator().on('submit', function (e) {
	if (!e.isDefaultPrevented()) {
		const $form = $(this);
		const form = this;
		const $sendBtn = $form.find('button:last');
		const $selectBtn = $form.find('.btn-file');
		const fileName = $form.find('input:file').get(0).files[0].name;
		const $listItem = $form.find('li:first');

		e.preventDefault();
		bootbox.confirm({
			title: 'Submit <code>' + fileName + '</code>?',
			message: 'Do you really want to submit <code>' + fileName + '</code>?<br>' +
			'<strong>If you have succeeded at least once, failure will not affect your score.</strong>',
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
							// correct
							200: function () {
								$correctBody.show();
								$incorrectBody.hide();
								$errorBody.hide();

								$resultModalHeader.text('Correct!');
								$resultModal.modal();


								$sendBtn.button('reset');
								$selectBtn.removeClass('disabled');

								form.reset();
								$form.validator('validate');

								if (!$listItem.hasClass('list-group-item-success')) {
									$listItem.addClass('list-group-item-success');
								}
								// TODO: link success info
							},
							// incorrect
							406: function (jqXHR) {
								const res = jqXHR.responseJSON;

								$correctBody.hide();
								$incorrectBody.show();
								$errorBody.hide();

								$inputBox.text(res.input);
								$outputBox.text(res.unmatchedOutput);
								$answerBox.text(res.answerOutput);

								$resultModalHeader.text('Incorrect!');
								$resultModal.modal();


								$sendBtn.button('reset');
								$selectBtn.removeClass('disabled');

								form.reset();
								$form.validator('validate');
							},
							// compile error
							400: function (jqXHR) {
								const res = jqXHR.responseJSON;

								$correctBody.hide();
								$incorrectBody.hide();
								$errorBody.show();

								$errorBox.text(res.errorMsg);

								$resultModalHeader.text('Compile Error!');
								$resultModal.modal();


								$sendBtn.button('reset');
								$selectBtn.removeClass('disabled');

								form.reset();
								$form.validator('validate');
							},
							500: function (jqXHR) {
								$correctBody.hide();
								$incorrectBody.hide();
								$errorBody.show();

								$errorBox.text("Probably there were errors in your code. Call Manager if you get same problem");

								$resultModalHeader.text('Something\'s wrong!');
								$resultModal.modal();
							}
							// TODO: handling errors
						}
					});
				}
			}
		});
	}
});