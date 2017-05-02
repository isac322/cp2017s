///<reference path="modal-result.ts"/>
var SubmissionHistoryAdmin;
(function (SubmissionHistoryAdmin) {
    var MAX_PAGE = document.documentElement.clientWidth >= 768 ? 10 : 5;
    var $resultTable = $('#resultTable');
    var $selects = $('.selectpicker');
    var $category = $('#selectCategory');
    var $result = $('#selectResult');
    var $email = $('#selectEmail');
    var $user = $('#selectUser');
    var prevQuery = location.search + '?t=0&';
    var rows = [];
    var $pageUL = $('#page-ul');
    var $prevPage = $('#page-prev');
    var $nextPage = $('#page-next');
    $prevPage.click(function (e) {
        if ($prevPage.hasClass('disabled')) {
            e.preventDefault();
        }
        else {
            send($pageUL.children(':nth-child(2)').data('val') - 1);
        }
    });
    $nextPage.click(function (e) {
        if ($nextPage.hasClass('disabled')) {
            e.preventDefault();
        }
        else {
            send($pageUL.children(':nth-last-child(2)').data('val') + 1);
        }
    });
    var pageLink = [];
    for (var i = 0; i < MAX_PAGE; i++) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.setAttribute('href', '#');
        a.addEventListener('click', function (e) {
            send($(e.target).parent().data('val'));
        });
        li.appendChild(a);
        pageLink.push({ li: $(li), a: $(a) });
        $nextPage.before(li);
    }
    function queryHandler(res) {
        $resultTable.children().detach();
        for (var i_1 = 0; i_1 < res.data.length; i_1++) {
            if (i_1 >= rows.length) {
                rows.push(new Row(res.data[i_1]));
            }
            else {
                rows[i_1].setData(res.data[i_1]);
            }
            $resultTable.append(rows[i_1].row);
        }
        var $categoryCol = $('.categoryCol');
        var $resultCol = $('.resultCol');
        var $emailCol = $('.emailCol');
        if ($category.val() === '0' || $category.val() === '2') {
            $resultCol.show();
        }
        else {
            $resultCol.hide();
        }
        if ($category.val() === '0') {
            $categoryCol.show();
        }
        else {
            $categoryCol.hide();
        }
        if ($email.children().length == 1) {
            $emailCol.hide();
        }
        var i = Math.floor((res.p / MAX_PAGE)) * MAX_PAGE, j = 0;
        for (; i < res.total && j < MAX_PAGE; i++, j++) {
            pageLink[j].li
                .removeClass('active')
                .data('val', i)
                .show();
            pageLink[j].a.text(i + 1);
        }
        for (; j < MAX_PAGE; j++)
            pageLink[j].li.hide();
        pageLink[res.p % MAX_PAGE].li.addClass('active');
        if (res.p < MAX_PAGE)
            $prevPage.addClass('disabled');
        else
            $prevPage.removeClass('disabled');
        if (res.total - res.p <= MAX_PAGE)
            $nextPage.addClass('disabled');
        else
            $nextPage.removeClass('disabled');
        $selects.prop('disabled', false);
        $selects.selectpicker('refresh');
    }
    var Row = (function () {
        function Row(value) {
            this.idTd = document.createElement('th');
            this.idTd.setAttribute('scope', 'row');
            this.categoryTd = document.createElement('td');
            this.fileTd = document.createElement('td');
            this.resultTd = document.createElement('td');
            this.timestampTd = document.createElement('td');
            this.emailTd = document.createElement('td');
            this.userTd = document.createElement('td');
            this.setData(value);
            this.row = document.createElement('tr');
            this.row.appendChild(this.idTd);
            this.row.appendChild(this.categoryTd);
            this.row.appendChild(this.fileTd);
            this.row.appendChild(this.resultTd);
            this.row.appendChild(this.timestampTd);
            this.row.appendChild(this.emailTd);
            this.row.appendChild(this.userTd);
        }
        Row.prototype.setData = function (value) {
            this.id = value.id;
            this.category = value.category;
            this.result = value.result;
            this.email = value.email;
            this.fileName = value.fileName;
            this.timestamp = value.timestamp;
            this.extension = value.extension;
            this.studentId = value.studentId;
            this.userName = value.name;
            this.idTd.textContent = String(this.id);
            this.categoryTd.textContent = this.category;
            var href = (this.category == 'Homework' ? '"/homework/' : '"/exercise/') + this.id + '"';
            var content;
            if (this.extension.valueOf() !== 'report' && this.extension.valueOf() !== 'zip') {
                content = '<button class="btn-link tdLinkBtn" onclick=\'codeModal(' + href + ', "' + this.extension + '", "' + this.fileName + '");\'>' + this.fileName + '</button>';
            }
            else {
                content = this.fileName;
            }
            this.fileTd.innerHTML =
                content + '<a class="btn-link pull-right" href=' + href + '><i class="fa fa-download"></i></a>';
            if (this.result != null) {
                if (this.result == 0)
                    this.resultTd.innerHTML = '<strong class="text-success">' + Row.RESULTS[this.result] + '</strong>';
                else
                    this.resultTd.innerHTML = '<button class="btn-link tdLinkBtn" onclick="SubmissionHistoryAdmin.onResult(' + this.id + ');">' +
                        '<strong class="text-danger">' + Row.RESULTS[this.result] + '</strong></button>';
            }
            else if (this.category != 'Exercise') {
                this.resultTd.textContent = '';
            }
            else {
                this.resultTd.textContent = 'Pending...';
            }
            this.timestampTd.textContent = new Date(this.timestamp).toLocaleString();
            this.emailTd.textContent = this.email;
            this.userTd.textContent = decodeURIComponent(this.userName);
            this.categoryTd.setAttribute('class', 'categoryCol');
            this.resultTd.setAttribute('class', 'resultCol');
            this.emailTd.setAttribute('class', 'emailCol');
        };
        return Row;
    }());
    Row.RESULTS = ['Correct', 'Incorrect', 'Compile Error', 'Timeout', 'Runtime Error', 'Fail to run'];
    function send(pageNum) {
        $selects.prop('disabled', true);
        $selects.selectpicker('refresh');
        if (pageNum == null)
            pageNum = 0;
        var newQuery = genQuery() + 'p=' + pageNum;
        if (prevQuery !== newQuery) {
            $.ajax('/history/list' + newQuery, { success: queryHandler });
            prevQuery = newQuery;
        }
        else {
            $selects.prop('disabled', false);
            $selects.selectpicker('refresh');
        }
    }
    $selects.on('hide.bs.select', function () {
        send();
    });
    var $homeworkGroup = $('#homeworkGroup');
    var $exerciseGroup = $('#exerciseGroup');
    var $projectGroup = $('#projectGroup');
    var $resultGroup = $('#resultGroup');
    $category.change(function () {
        switch ($category.val()) {
            case '0':
                $homeworkGroup.children().show();
                $exerciseGroup.children().show();
                $projectGroup.children().show();
                $resultGroup.show();
                break;
            case '1':
                $homeworkGroup.children().show();
                $exerciseGroup.children().prop('selected', false).hide();
                $projectGroup.children().prop('selected', false).hide();
                $resultGroup.hide();
                break;
            case '2':
                $homeworkGroup.children().prop('selected', false).hide();
                $exerciseGroup.children().show();
                $projectGroup.children().prop('selected', false).hide();
                $resultGroup.show();
                break;
            case '3':
                $homeworkGroup.children().prop('selected', false).hide();
                $exerciseGroup.children().prop('selected', false).hide();
                $projectGroup.children().show();
                $resultGroup.hide();
        }
        $selects.selectpicker('refresh');
    });
    function genQuery() {
        // homework
        var homeworkQuery = '';
        $homeworkGroup.children(':selected').each(function (index, elem) {
            homeworkQuery += 'hw=' + elem.value + '&';
        });
        // exercise
        var exerciseQuery = '';
        $exerciseGroup.children(':selected').each(function (index, elem) {
            exerciseQuery += 'ex=' + elem.value + '&';
        });
        // exercise
        var projectQuery = '';
        $projectGroup.children(':selected').each(function (index, elem) {
            projectQuery += 'pj=' + elem.value + '&';
        });
        // result
        var resultQuery = '';
        $result.children(':selected').each(function (index, elem) {
            resultQuery += 'r=' + elem.value + '&';
        });
        // result
        var emailQuery = '';
        $email.children(':selected').each(function (index, elem) {
            emailQuery += 'e=' + elem.value + '&';
        });
        // user
        var userQuery = '';
        $user.children(':selected').each(function (index, elem) {
            userQuery += 'u=' + elem.value + '&';
        });
        return '?t=' + $category.val() + '&' + homeworkQuery + exerciseQuery + projectQuery + resultQuery + emailQuery + userQuery;
    }
    send();
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
        $('.selectpicker:not(#selectUser)').selectpicker('mobile');
        $selects.focusout(function () {
            send();
        });
    }
    var resultModal = new ResultModal($('#resultModal'));
    function onResult(id) {
        $.ajax('/exercise/result/' + id, {
            complete: function (jqXHR) {
                var res = jqXHR.responseJSON;
                switch (jqXHR.status) {
                    // dose not sign in yet
                    case 401:
                        document.location.href = '/';
                        break;
                    // correct
                    case 200:
                        resultModal.setCorrect();
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
                        resultModal.setServerError('Some error occurs on the judging server. Please contact to web administrator with your error ID : <code>' + res.id + '</code>.');
                        break;
                }
            }
        });
    }
    SubmissionHistoryAdmin.onResult = onResult;
})(SubmissionHistoryAdmin || (SubmissionHistoryAdmin = {}));
