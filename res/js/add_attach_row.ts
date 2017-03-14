let rowCount = 0;

const currentForm: JQuery = $('#create-hw');
const attachTemplate: JQuery = $('#list-item_template').removeAttr('id').hide();
const attachList: JQuery = $('#attach-list');

$('#btn-append-item').click((event: JQueryEventObject) => {
	event.preventDefault();

	// create new row and add to list-group
	const attachRow: JQuery = attachTemplate.clone();
	attachRow.appendTo(attachList).fadeIn(400);

	// change
	const nameColumn = attachRow.find('.file-name:first');
	nameColumn.find('input:first').attr('name', 'attachment[' + rowCount + '][name]');

	const extColumn = attachRow.find('.extension:first');
	extColumn.find('select:first').attr('name', 'attachment[' + rowCount + '][extension]');

	currentForm.validator('update');
	currentForm.validator('validate');

	rowCount++;
});


$('#btn-append-item').trigger('click');


$('body').on('click', '.btn-remove-item', (event: JQueryEventObject) => {
	const clicked = $(event.target).closest('li');
	clicked.fadeOut(300, () => {
		clicked.remove();
		currentForm.validator('update');
	});
});