"use strict";
var SubmissionHistory;
(function (SubmissionHistory) {
    const MAX_PAGE = document.documentElement.clientWidth >= 768 ? 10 : 5;
    class Row {
        constructor(value) {
            this.idTd = document.createElement('th');
            this.idTd.setAttribute('scope', 'row');
            this.categoryTd = document.createElement('td');
            this.fileTd = document.createElement('td');
            this.resultTd = document.createElement('td');
            this.timestampTd = document.createElement('td');
            this.emailTd = document.createElement('td');
            this.categoryTd.setAttribute('class', 'categoryCol');
            this.resultTd.setAttribute('class', 'resultCol');
            this.emailTd.setAttribute('class', 'emailCol');
            this.row = document.createElement('tr');
            this.row.appendChild(this.idTd);
            this.row.appendChild(this.categoryTd);
            this.row.appendChild(this.fileTd);
            this.row.appendChild(this.resultTd);
            this.row.appendChild(this.timestampTd);
            this.row.appendChild(this.emailTd);
            this.setData(value);
        }
        setData(value) {
            this.id = value.id;
            this.category = value.category;
            this.result = value.result;
            this.email = value.email;
            this.fileName = value.fileName;
            this.timestamp = value.timestamp;
            this.extension = value.extension;
            this.studentId = value.studentId;
            this.idTd.textContent = String(this.id);
            this.categoryTd.textContent = this.category;
            const href = '"/' + this.category.toLowerCase() + '/' + this.id + '"';
            let content;
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
                    this.resultTd.innerHTML = '<button class="btn-link tdLinkBtn" onclick="SubmissionHistory.onResult(' + this.id + ');">' +
                        '<strong class="text-danger">' + Row.RESULTS[this.result] + '</strong></button>';
            }
            else if (this.category != 'Exercise') {
                this.resultTd.textContent = '';
            }
            else {
                this.resultTd.textContent = 'Pending...';
            }
            this.timestampTd.textContent = new Date(this.timestamp).toLocaleString(undefined, {
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
            });
            this.emailTd.textContent = this.email;
        }
    }
    Row.RESULTS = ['Correct', 'Incorrect', 'Compile Error', 'Timeout', 'Runtime Error', 'Fail to run'];
    const $resultTable = $('#resultTable');
    const $result = $('#selectResult');
    const $email = $('#selectEmail');
    const $user = $('#selectUser');
    let rows = [];
    function queryHandler(res, force) {
        updateTable(res);
        if (force)
            history.replaceState(res, '', currQuery);
        else
            history.pushState(res, '', currQuery);
    }
    function updateTable(res) {
        $resultTable.children().detach();
        for (let i = 0; i < res.data.length; i++) {
            if (i >= rows.length) {
                rows.push(new Row(res.data[i]));
            }
            else {
                rows[i].setData(res.data[i]);
            }
            $resultTable.append(rows[i].row);
        }
        const $categoryCol = $('.categoryCol');
        const $resultCol = $('.resultCol');
        const $emailCol = $('.emailCol');
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
        let i = res.p - res.p % MAX_PAGE, j = 0;
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
        if ((res.total - 1) / MAX_PAGE >> 0 == res.p / MAX_PAGE >> 0)
            $nextPage.addClass('disabled');
        else
            $nextPage.removeClass('disabled');
        $selects.prop('disabled', false);
        $selects.selectpicker('refresh');
    }
    function updateSelect() {
        currQuery = location.search == '' ? '?t=0&' : location.search;
        const ret = currQuery.substr(1).split('&')
            .filter((e) => e != '')
            .map((e) => e.split('='))
            .reduce((prev, curr) => {
            if (curr[0] == 'p')
                return prev;
            prev[curr[0]].push(curr[1]);
            return prev;
        }, { t: [], hw: [], ex: [], pj: [], r: [], e: [], u: [] });
        ret.hw = ret.hw.map(((value) => 'h' + value));
        ret.ex = ret.ex.map(((value) => 'e' + value));
        ret.pj = ret.pj.map(((value) => 'p' + value));
        $category.val(ret.t).change();
        $('#selectId').selectpicker('val', ret.hw.concat(ret.ex, ret.pj));
        $result.selectpicker('val', ret.r);
        $email.selectpicker('val', ret.e);
        $user.selectpicker('val', ret.u);
    }
    function send(pageNum, force) {
        $selects.prop('disabled', true);
        $selects.selectpicker('refresh');
        if (pageNum == null)
            pageNum = 0;
        const newQuery = genQuery() + 'p=' + pageNum;
        if (force || currQuery !== newQuery) {
            $.ajax('/history/list' + newQuery, {
                success: (data) => queryHandler(data, force),
                error: (jqXHR) => {
                    switch (jqXHR.status) {
                        case 401:
                            document.location.href = '/';
                    }
                }
            });
            currQuery = newQuery;
        }
        else {
            $selects.prop('disabled', false);
            $selects.selectpicker('refresh');
        }
    }
    function genQuery() {
        let homeworkQuery = '';
        $homeworkGroup.children(':selected').each((index, elem) => {
            homeworkQuery += 'hw=' + elem.value.substr(1) + '&';
        });
        let exerciseQuery = '';
        $exerciseGroup.children(':selected').each((index, elem) => {
            exerciseQuery += 'ex=' + elem.value.substr(1) + '&';
        });
        let projectQuery = '';
        $projectGroup.children(':selected').each((index, elem) => {
            projectQuery += 'pj=' + elem.value.substr(1) + '&';
        });
        let resultQuery = '';
        $result.children(':selected').each((index, elem) => {
            resultQuery += 'r=' + elem.value + '&';
        });
        let emailQuery = '';
        $email.children(':selected').each((index, elem) => {
            emailQuery += 'e=' + elem.value + '&';
        });
        return '?t=' + $category.val() + '&' + homeworkQuery + exerciseQuery + projectQuery + resultQuery + emailQuery;
    }
    function onResult(id) {
        const resultModal = new ResultModal($('#resultModal'));
        $.ajax('/exercise/result/' + id, {
            complete: (jqXHR) => {
                const res = jqXHR.responseJSON;
                switch (jqXHR.status) {
                    case 401:
                        document.location.href = '/';
                        break;
                    case 200:
                        resultModal.setCorrect();
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
            }
        });
    }
    SubmissionHistory.onResult = onResult;
    const $pageUL = $('#page-ul');
    const $prevPage = $('#page-prev');
    const $nextPage = $('#page-next');
    $prevPage.click((e) => {
        if ($prevPage.hasClass('disabled')) {
            e.preventDefault();
        }
        else {
            send($pageUL.children(':nth-child(2)').data('val') - 1);
        }
    });
    $nextPage.click((e) => {
        if ($nextPage.hasClass('disabled')) {
            e.preventDefault();
        }
        else {
            send($pageUL.children(':nth-last-child(2)').data('val') + 1);
        }
    });
    let pageLink = [];
    for (let i = 0; i < MAX_PAGE; i++) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.addEventListener('click', (e) => send($(e.target).parent().data('val')));
        li.appendChild(a);
        pageLink.push({ li: $(li), a: $(a) });
        $nextPage.before(li);
    }
    const $selects = $('.selectpicker');
    const $category = $('#selectCategory');
    $selects.on('hide.bs.select', () => send());
    const $homeworkGroup = $('#homeworkGroup');
    const $exerciseGroup = $('#exerciseGroup');
    const $projectGroup = $('#projectGroup');
    const $resultGroup = $('#resultGroup');
    $category.change(() => {
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
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
        $('.selectpicker:not(#selectUser)').selectpicker('mobile');
        $selects.focusout(() => send());
    }
    window.onpopstate = (e) => {
        updateSelect();
        updateTable(e.state);
    };
    let currQuery;
    updateSelect();
    send(undefined, true);
})(SubmissionHistory || (SubmissionHistory = {}));
//# sourceMappingURL=submission_history.js.map