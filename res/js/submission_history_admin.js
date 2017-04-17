var $resultTable = $('#resultTable');
var $selects = $('.selectpicker');
var $category = $('#selectCategory');
var $id = $('#selectId');
var $result = $('#selectResult');
var $email = $('#selectEmail');
var $user = $('#selectUser');
var prevQuery = location.search;
var rows = [];
var Data = (function () {
    function Data() {
    }
    return Data;
}());
var queryHandler = function (data) {
    $resultTable.children().detach();
    for (var i = 0; i < data.length; i++) {
        if (i >= rows.length)
            rows.push(new Row(data[i]));
        else
            rows[i].setData(data[i]);
        $resultTable.append(rows[i].row);
    }
    var $categoryCol = $('.categoryCol');
    switch ($category.val()) {
        case '3':
            $categoryCol.show();
            break;
        case '1':
            $categoryCol.hide();
            break;
        case '2':
            $categoryCol.hide();
    }
    $selects.prop('disabled', false);
    $selects.selectpicker('refresh');
};
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
        if (this.category == 'Homework') {
            this.fileTd.innerHTML = '<a class="btn-link" href="/homework/' + this.id + '">' + this.fileName + '</a>';
        }
        else {
            this.fileTd.innerHTML = '<a class="btn-link" href="/exercise/' + this.id + '">' + this.fileName + '</a>';
        }
        if (this.result != null) {
            if (this.result == 0)
                this.resultTd.innerHTML = '<a class="btn-link" href="#"><strong class="text-success">' + Row.RESULTS[this.result] + '</strong></a>';
            else
                this.resultTd.innerHTML = '<a class="btn-link" href="#"><strong class="text-danger">' + Row.RESULTS[this.result] + '</strong></a>';
        }
        else if (this.category == 'Homework') {
            this.resultTd.textContent = '';
        }
        else {
            this.resultTd.textContent = 'Pending...';
        }
        this.timestampTd.textContent = new Date(this.timestamp).toLocaleString();
        this.emailTd.textContent = this.email;
        this.userTd.textContent = decodeURIComponent(this.userName);
        this.categoryTd.setAttribute('class', 'categoryCol');
    };
    return Row;
}());
Row.RESULTS = ['Correct', 'Incorrect', 'Compile Error', 'Timeout', 'Runtime Error', 'Fail to run'];
$selects.on('hide.bs.select', function () {
    $selects.prop('disabled', true);
    $selects.selectpicker('refresh');
    var newQuery = genQuery();
    if (prevQuery !== newQuery) {
        $.ajax('history/list' + genQuery(), { success: queryHandler });
        prevQuery = newQuery;
    }
    else {
        $selects.prop('disabled', false);
        $selects.selectpicker('refresh');
    }
});
var $homeworkGroup = $('#homeworkGroup');
var $exerciseGroup = $('#exerciseGroup');
var $resultGroup = $('#resultGroup');
$category.change(function () {
    switch ($category.val()) {
        case '3':
            $homeworkGroup.children().show();
            $exerciseGroup.children().show();
            $resultGroup.show();
            break;
        case '1':
            $homeworkGroup.children().show();
            $exerciseGroup.children().prop('selected', false).hide();
            $resultGroup.hide();
            break;
        case '2':
            $homeworkGroup.children().prop('selected', false).hide();
            $exerciseGroup.children().show();
            $resultGroup.show();
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
    return '?t=' + $category.val() + '&' + homeworkQuery + exerciseQuery + resultQuery + emailQuery + userQuery;
}
$.ajax('history/list' + prevQuery, { success: queryHandler });
