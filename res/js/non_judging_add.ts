let currentRowCount = 0;

const currentForm: JQuery = $('#create-form');
const attachTemplate: JQuery = $('#list-item_template').removeAttr('id').hide();
const attachList: JQuery = $('#attach-list');

const btnAppend: JQuery = $('#btn-append-item');

btnAppend.on('click', (event: JQuery.ClickEvent<HTMLAnchorElement>) => {
	event.preventDefault();

	// create new row and add to list-group
	const attachRow: JQuery = attachTemplate.clone();
	attachRow.appendTo(attachList).fadeIn(400);

	currentForm.validator('update');

	currentRowCount++;

	if (currentRowCount == 2) {
		attachList.children().first().find('.wrapper-btn-remove:first').fadeIn(300);
	}
});


btnAppend.trigger('click');
attachList.children().first().find('.wrapper-btn-remove:first').hide();


$('body').on('click', '.btn-remove-item', (event: JQuery.ClickEvent<HTMLAnchorElement>) => {
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