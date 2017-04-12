var $resultTable = $('#resultTable');
var $selects = $('.selectpicker');
var $category = $('#selectCategory');
var $id = $('#selectId');
var $result = $('#selectResult');
var $email = $('#selectEmail');
var prevQuery = location.search;
var rows = [];
var Data = (function () {
    function Data() {
    }
    return Data;
}());
var queryHandler = function (data) {
    $resultTable.children().detach();
    data.forEach(function (value, index) {
        if (index >= rows.length) {
            rows.push(new Row(value, 'Exercise'));
        }
        else {
            rows[index].setData(value, 'Exercise');
        }
        $resultTable.append(rows[index].row);
    });
};
var Row = (function () {
    function Row(value, category) {
        this.idTd = document.createElement('th');
        this.idTd.setAttribute('scope', 'row');
        this.categoryTd = document.createElement('td');
        this.fileTd = document.createElement('td');
        this.resultTd = document.createElement('td');
        this.timestampTd = document.createElement('td');
        this.emailTd = document.createElement('td');
        this.setData(value, category);
        this.row = document.createElement('tr');
        this.row.appendChild(this.idTd);
        this.row.appendChild(this.categoryTd);
        this.row.appendChild(this.fileTd);
        this.row.appendChild(this.resultTd);
        this.row.appendChild(this.timestampTd);
        this.row.appendChild(this.emailTd);
    }
    Row.prototype.setData = function (value, category) {
        this.id = value.id;
        this.category = category;
        this.result = value.result;
        this.email = value.email;
        this.fileName = value.fileName;
        this.hashedName = value.hashedName;
        this.timestamp = value.timestamp;
        this.extension = value.extension;
        this.studentId = value.studentId;
        this.idTd.textContent = String(this.id);
        this.categoryTd.textContent = this.category;
        this.fileTd.textContent = this.fileName;
        this.resultTd.textContent = Row.RESULTS[this.result];
        this.timestampTd.textContent = new Date(this.timestamp).toLocaleString();
        this.emailTd.textContent = this.email;
        this.categoryTd.setAttribute('class', 'categoryCol');
    };
    return Row;
}());
Row.RESULTS = ['Correct', 'Incorrect', 'Compile Error', 'Timeout', 'Runtime Error', 'Fail to run'];
$selects.on('hide.bs.select', function () {
    $selects.prop('disabled', true);
    $selects.selectpicker('refresh');
    var newQuery = genQuery();
    console.log(newQuery, prevQuery);
    if (prevQuery !== newQuery) {
        $.ajax('history/list' + genQuery(), { success: queryHandler });
        prevQuery = newQuery;
        $selects.prop('disabled', false);
        $selects.selectpicker('refresh');
    }
});
var $homeworkGroup = $('#homeworkGroup');
var $exerciseGroup = $('#exerciseGroup');
$category.change(function () {
    switch ($category.val()) {
        case 3:
            $homeworkGroup.children().show();
            $exerciseGroup.children().show();
            break;
        case 1:
            $homeworkGroup.children().show();
            $exerciseGroup.children().prop("selected", false).hide();
            break;
        case 2:
            $homeworkGroup.children().prop("selected", false).hide();
            $exerciseGroup.children().show();
    }
    $selects.selectpicker('hide');
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
    return '?t=' + $category.val() + '&' + homeworkQuery + exerciseQuery + resultQuery + emailQuery;
}
$.ajax('history/list' + prevQuery, { success: queryHandler });
