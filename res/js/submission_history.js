var $resultTable = $('#resultTable');
var $selects = $('.selectpicker');
var $category = $('#selectCategory');
var $id = $('#selectId');
var $result = $('#selectResult');
var $email = $('#selectEmail');
var $user = $('#selectUser');
var prevQuery = '';
var queryHandler = {
    200: function (data) {
        console.log(data);
    }
};
var Row = (function () {
    function Row(id, result, email, fileName, hashedName, timestamp, extension, studentId) {
        this.id = id;
        this.result = result;
        this.email = email;
        this.fileName = fileName;
        this.hashedName = hashedName;
        this.timestamp = timestamp;
        this.extension = extension;
        this.studentId = studentId;
        this.row = document.createElement('tr');
        this.idTd = document.createElement('th');
        this.categoryTd = document.createElement('td');
        this.fileTd = document.createElement('td');
        this.resultTd = document.createElement('td');
        this.timestampTd = document.createElement('td');
        this.emailTd = document.createElement('td');
        this.userTd = document.createElement('td');
    }
    return Row;
}());
$selects.on('hide.bs.select', function () {
    $selects.prop('disabled', false);
    $selects.selectpicker('refresh');
    var newQuery = genQuery();
    if (prevQuery !== newQuery) {
        $.ajax('history/list' + genQuery(), { statusCode: queryHandler });
        prevQuery = newQuery;
    }
});
var $homeworkGroup = $('#homeworkGroup');
var $exerciseGroup = $('#exerciseGroup');
$category.change(function () {
    switch ($category.val()) {
        case 'All':
            $homeworkGroup.children().show();
            $exerciseGroup.children().show();
            break;
        case 'Homework':
            $homeworkGroup.children().show();
            $exerciseGroup.children().prop("selected", false).hide();
            break;
        case 'Exercise':
            $homeworkGroup.children().prop("selected", false).hide();
            $exerciseGroup.children().show();
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
    return '?' + homeworkQuery + exerciseQuery + resultQuery + emailQuery + userQuery;
}
