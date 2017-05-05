"use strict";
var SubmitHomework;
(function (SubmitHomework) {
    const $confirmModal = $('#confirmModal');
    const $confirmHeader = $('#confirmModalLabel');
    const $confirmBody = $('#confirmBody');
    const $confirmOK = $('#confirmOK');
    $('.upload-form').validator().on('submit', function (e) {
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
                }
            });
            $confirmModal.modal('hide');
        });
        $confirmModal.modal('show');
    });
})(SubmitHomework || (SubmitHomework = {}));
//# sourceMappingURL=submit_non_judging_file.js.map