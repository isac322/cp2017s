"use strict";
var SubmitExercise;
(function (SubmitExercise) {
    const $confirmModal = $('#confirmModal');
    const $confirmHeader = $('#confirmModalLabel');
    const $confirmBody = $('#confirmBody');
    const $confirmOK = $('#confirmOK');
    const resultModal = new ResultModal($('#resultModal'));
    $('.upload-form').validator().on('submit', (e) => {
        if (e.isDefaultPrevented())
            return;
        e.preventDefault();
        const $form = $(e.target);
        const form = e.target;
        const $sendBtn = $form.find('button:last');
        const $selectBtn = $form.find('.btn-file');
        const fileName = $form.find('input:file')[0].files[0].name;
        const $listItem = $form.find('li:first');
        $confirmHeader.html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' +
            ' Submit <code>' + fileName + '</code>?');
        $confirmBody.html('Do you really want to submit <code>' + fileName + '</code>?<br>' +
            '<strong>If you have succeeded at least once, failure will not affect your score.</strong>');
        $confirmOK.off('click');
        $confirmOK.click(() => {
            $sendBtn.button('loading');
            $selectBtn.addClass('disabled');
            $form.ajaxSubmit({
                complete: (jqXHR) => {
                    const res = jqXHR.responseJSON;
                    switch (jqXHR.status) {
                        case 401:
                            document.location.href = '/';
                            break;
                        case 200:
                            resultModal.setCorrect();
                            $listItem.addClass('list-group-item-success');
                            break;
                        case 406:
                            resultModal.setIncorrect(res.input, res.answerOutput, res.userOutput);
                            break;
                        case 410:
                            resultModal.setTimeout(res.input);
                            break;
                        case 412:
                            resultModal.setRuntimeError(res.returnCode, res.errorLog, res.input);
                            break;
                        case 400:
                            resultModal.setCompileError(res.errorMsg);
                            break;
                        case 417:
                            resultModal.setFailToRun(res.errorMsg.replace('/\n/g', '<br>'));
                            break;
                        case 500:
                            resultModal.setServerError('Some error occurs on the judging server. Please contact to web administrator with your error ID : <code>' + res.id + '</code>.');
                            break;
                    }
                    $sendBtn.button('reset');
                    $selectBtn.removeClass('disabled');
                    form.reset();
                    $form.validator('validate');
                }
            });
            $confirmModal.modal('hide');
        });
        $confirmModal.modal('show');
    });
})(SubmitExercise || (SubmitExercise = {}));
//# sourceMappingURL=submit_exercise.js.map