// wrap cards with row
const cards = $('.problem-card');
for (let i = 0; i < cards.length; i += 2) {
	cards.slice(i, i + 2).wrapAll('<div class="row"></div>');
}


// card appender
$('.appender').on('click', function () {
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