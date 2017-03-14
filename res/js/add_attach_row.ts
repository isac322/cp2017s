let rowCount = 0;

const currentForm: JQuery = $('#create-hw');
const attachTemplate: JQuery = $('#list-item_template').removeAttr('id').hide();
const attachList: JQuery = $('#attach-list');

$('#btn-append-item').click((event: JQueryEventObject) => {
	event.preventDefault();

	const attachRow: JQuery = attachTemplate.clone().show();
	attachRow.appendTo(attachList);

	const nameColumn = attachRow.find('.file-name:first');
	nameColumn.find('label:first').attr('for', 'filename_' + rowCount);
	nameColumn.find('input:first')
		.attr('id', 'filename_' + rowCount)
		.attr('name', 'attachment[' + rowCount + '][name]');

	const extColumn = attachRow.find('.extension:first');
	extColumn.find('label:first').attr('for', 'extension_' + rowCount);
	extColumn.find('select:first')
		.attr('id', 'extension_' + rowCount)
		.attr('name', 'attachment[' + rowCount + '][extension]');

	currentForm.validator('update');
	currentForm.validator('validate');

	rowCount++;
});

$('#btn-append-item').trigger('click');