"use strict";
let accumulatedRowCount = 0;
let currentRowCount = 0;
const currentForm = $('#create-form');
const attachTemplate = $('#list-item_template').removeAttr('id').hide();
const attachList = $('#attach-list');
const btnAppend = $('#btn-append-item');
btnAppend.click((event) => {
    event.preventDefault();
    const attachRow = attachTemplate.clone();
    attachRow.appendTo(attachList).fadeIn(400);
    const nameColumn = attachRow.find('.file-name:first');
    nameColumn.find('input:first').attr('name', 'attachment[' + accumulatedRowCount + '][name]');
    const extColumn = attachRow.find('.extension:first');
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
$('body').on('click', '.btn-remove-item', (event) => {
    const clicked = $(event.target).closest('li');
    currentRowCount--;
    if (currentRowCount == 1) {
        const sibling = clicked.siblings('li');
        sibling.find('.wrapper-btn-remove:first').fadeOut(150);
    }
    clicked.fadeOut(300, () => {
        clicked.remove();
        currentForm.validator('update');
    });
});
//# sourceMappingURL=non_judging_add.js.map