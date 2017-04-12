"use strict";

const $confirmModal = $('#confirmModal');
const $confirmHeader = $('#confirmModalLabel');
const $confirmBody = $('#confirmBody');
const $confirmOK = $('#confirmOK');


const $resultModal = $('#resultModal');
const $resultModalHeader = $('#resultModalLabel');
const $correctBody = $('#correctBody');
const $incorrectBody = $('#incorrectBody');
const $runtimeErrorBody = $('#runtimeErrorBody');
const $compileErrorBody = $('#compileErrorBody');
const $timeoutBody = $('#timeoutBody');
const $errorBody = $('#errorBody');

const $inputBox = $('#inputBox');
const $outputBox = $('#outputBox');
const $answerBox = $('#answerBox');

const $compileErrorBox = $('#compileErrorBox');
const $runtimeErrorSignal = $('#runtimeErrorSignal');
const $runtimeErrorBox = $('#runtimeErrorBox');
const $runtimeErrorInputBox = $('#runtimeErrorInputBox');
const $timeoutInputBox = $('#timeoutInputBox');
const $errorBox = $('#errorBox');


$confirmModal.on('shown.bs.modal', function () {
	$confirmOK.focus();
});


$('.upload-form').validator().on('submit', function (e) {
	if (!e.isDefaultPrevented()) {
		const $form = $(this);
		const form = this;
		const $sendBtn = $form.find('button:last');
		const $selectBtn = $form.find('.btn-file');
		const fileName = $form.find('input:file').get(0).files[0].name;
		const $listItem = $form.find('li:first');

		e.preventDefault();

		$confirmHeader.html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' +
			' Submit <code>' + fileName + '</code>?');
		$confirmBody.html('Do you really want to submit <code>' + fileName + '</code>?<br>' +
			'<strong>If you have succeeded at least once, failure will not affect your score.</strong>');

		$confirmOK.off('click');
		$confirmOK.click(function () {
			$sendBtn.button('loading');
			$selectBtn.addClass('disabled');

			$form.ajaxSubmit({
				statusCode: {
					// correct
					200: function () {
						$correctBody.show();
						$incorrectBody.hide();
						$runtimeErrorBody.hide();
						$compileErrorBody.hide();
						$timeoutBody.hide();
						$errorBody.hide();

						$resultModalHeader.removeClass('text-danger');
						$resultModalHeader.addClass('text-success');

						$resultModalHeader.html('<i class="fa fa-check-circle" aria-hidden="true"></i> Correct !');
						$resultModal.modal();


						$sendBtn.button('reset');
						$selectBtn.removeClass('disabled');

						form.reset();
						$form.validator('validate');

						$listItem.addClass('list-group-item-success');
						// TODO: link success info
					},
					// not sign in yet
					401: function () {
						document.location.href = '/';
					},
					// incorrect
					406: function (jqXHR) {
						const res = jqXHR.responseJSON;

						$correctBody.hide();
						$incorrectBody.show();
						$runtimeErrorBody.hide();
						$compileErrorBody.hide();
						$timeoutBody.hide();
						$errorBody.hide();

						$inputBox.text(res.input);
						$outputBox.text(res.userOutput);
						$answerBox.text(res.answerOutput);

						$resultModalHeader.removeClass('text-success');
						$resultModalHeader.addClass('text-danger');

						$resultModalHeader.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Incorrect !');
						$resultModal.modal();


						$sendBtn.button('reset');
						$selectBtn.removeClass('disabled');

						form.reset();
						$form.validator('validate');
					},
					// timeout
					410: function (jqXHR) {
						const res = jqXHR.responseJSON;

						$correctBody.hide();
						$incorrectBody.hide();
						$runtimeErrorBody.hide();
						$compileErrorBody.hide();
						$timeoutBody.show();
						$errorBody.hide();

						$timeoutInputBox.text(res.input);

						$resultModalHeader.removeClass('text-success');
						$resultModalHeader.addClass('text-danger');

						$resultModalHeader.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Timeout !');
						$resultModal.modal();


						$sendBtn.button('reset');
						$selectBtn.removeClass('disabled');

						form.reset();
						$form.validator('validate');
					},
					// runtime error
					412: function (jqXHR) {
						const res = jqXHR.responseJSON;

						$correctBody.hide();
						$incorrectBody.hide();
						$runtimeErrorBody.show();
						$compileErrorBody.hide();
						$timeoutBody.hide();
						$errorBody.hide();


						$runtimeErrorSignal.text(res.returnCode);
						$runtimeErrorBox.text(res.errorLog);
						$runtimeErrorInputBox.text(res.input);

						$resultModalHeader.removeClass('text-success');
						$resultModalHeader.addClass('text-danger');

						$resultModalHeader.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Runtime Error !');
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
						$runtimeErrorBody.hide();
						$compileErrorBody.show();
						$timeoutBody.hide();
						$errorBody.hide();

						$compileErrorBox.text(res.errorMsg);


						$resultModalHeader.removeClass('text-success');
						$resultModalHeader.addClass('text-danger');

						$resultModalHeader.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Compile Error !');
						$resultModal.modal();


						$sendBtn.button('reset');
						$selectBtn.removeClass('disabled');

						form.reset();
						$form.validator('validate');
					},
					// compile error
					417: function (jqXHR) {
						const res = jqXHR.responseJSON;

						$correctBody.hide();
						$incorrectBody.hide();
						$runtimeErrorBody.hide();
						$compileErrorBody.show();
						$timeoutBody.hide();
						$errorBody.hide();

						$compileErrorBox.text(res.errorMsg.replace('/\n/g', '<br>'));


						$resultModalHeader.removeClass('text-success');
						$resultModalHeader.addClass('text-danger');

						$resultModalHeader.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Fail to run !');
						$resultModal.modal();


						$sendBtn.button('reset');
						$selectBtn.removeClass('disabled');

						form.reset();
						$form.validator('validate');
					},
					// server error
					500: function (jqXHR) {
						const res = jqXHR.responseJSON;

						$correctBody.hide();
						$incorrectBody.hide();
						$runtimeErrorBody.hide();
						$compileErrorBody.hide();
						$timeoutBody.hide();
						$errorBody.show();

						$errorBox.html('Some error occurs on the judging server. Please contact to web administrator with your error ID : <code>' + res.id + '</code>.');

						$resultModalHeader.removeClass('text-success');
						$resultModalHeader.addClass('text-danger');

						$resultModalHeader.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Something\'s wrong !');
						$resultModal.modal();


						$sendBtn.button('reset');
						$selectBtn.removeClass('disabled');

						form.reset();
						$form.validator('validate');
					}
					// TODO: handling errors
				}
			});

			$confirmModal.modal('hide');
		});

		$confirmModal.modal('show');
	}
});