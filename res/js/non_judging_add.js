var accumulatedRowCount = 0;
var currentRowCount = 0;
var currentForm = $('#create-form');
var attachTemplate = $('#list-item_template').removeAttr('id').hide();
var attachList = $('#attach-list');
var btnAppend = $('#btn-append-item');
btnAppend.click(function (event) {
    event.preventDefault();
    // create new row and add to list-group
    var attachRow = attachTemplate.clone();
    attachRow.appendTo(attachList).fadeIn(400);
    // change
    var nameColumn = attachRow.find('.file-name:first');
    nameColumn.find('input:first').attr('name', 'attachment[' + accumulatedRowCount + '][name]');
    var extColumn = attachRow.find('.extension:first');
    extColumn.find('select:first').attr('name', 'attachment[' + accumulatedRowCount + '][extension]');
    currentForm.validator('update');
    accumulatedRowCount++;
    currentRowCount++;
    if (currentRowCount == 2) {
        attachList.children().first().find('.wrapper-btn-remove:first').fadeIn(300);
    }
});
btnAppend.trigger('click');
attachList.children().first().find('.wrapper-btn-remove:first').hide();
$('body').on('click', '.btn-remove-item', function (event) {
    var clicked = $(event.target).closest('li');
    currentRowCount--;
    if (currentRowCount == 1) {
        var sibling = clicked.siblings('li');
        sibling.find('.wrapper-btn-remove:first').fadeOut(150);
    }
    clicked.fadeOut(300, function () {
        clicked.remove();
        currentForm.validator('update');
    });
});
