// wrap cards with row
const cards = $('.homework-card');
for (let i = 0; i < cards.length; i += 2) {
	cards.slice(i, i + 2).wrapAll('<div class="row"></div>');
}

// input:file handling
const files = $(':file');
files.on('change', function () {
	const label = this.files[0].name;

	$(this).trigger('fileselect', label);
});

files.on('fileselect', function (event, label) {
	const parent = $(this).parents('.input-group');
	parent.find(':text').val(label);
	parent.find('button:last').focus();
});


// card appender
$('.appender').click(function () {
	const icon = $(this).find('span:last');

	if (icon.hasClass('glyphicon-menu-down')) {
		icon.removeClass('glyphicon-menu-down')
			.addClass('glyphicon-menu-up');
	}
	else {
		icon.removeClass('glyphicon-menu-up')
			.addClass('glyphicon-menu-down');
	}
});