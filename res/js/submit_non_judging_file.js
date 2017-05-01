var SubmitHomework;
(function (SubmitHomework) {
    var $confirmModal = $('#confirmModal');
    var $confirmHeader = $('#confirmModalLabel');
    var $confirmBody = $('#confirmBody');
    var $confirmOK = $('#confirmOK');
    $('.upload-form').validator().on('submit', function (e) {
        if (e.isDefaultPrevented())
            return;
        e.preventDefault();
        var $form = $(e.target);
        var form = e.target;
        var $sendBtn = $form.find('button:last');
        var $selectBtn = $form.find('.btn-file');
        var fileName = $form.find('input:file')[0].files[0].name;
        var $listItem = $form.find('li:first');
        $confirmHeader.html('<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>' +
            ' Submit <code>' + fileName + '</code>?');
        $confirmBody.html('Do you really want to submit <code>' + fileName + '</code>?<br>' +
            '<strong>If you have previously submitted, the last one will be overwritten.</strong>');
        $confirmOK.off('click');
        $confirmOK.click(function () {
            $sendBtn.button('loading');
            $selectBtn.addClass('disabled');
            $form.ajaxSubmit({
                statusCode: {
                    202: function () {
                        $sendBtn.button('reset');
                        $selectBtn.removeClass('disabled');
                        form.reset();
                        $form.validator('validate');
                        $listItem.addClass('list-group-item-success');
                    },
                    401: function () {
                        document.location.href = '/';
                    }
                    // TODO: handling errors
                }
            });
            $confirmModal.modal('hide');
        });
        $confirmModal.modal('show');
    });
})(SubmitHomework || (SubmitHomework = {}));
