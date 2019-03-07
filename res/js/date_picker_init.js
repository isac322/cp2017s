$('#date_picker').datepicker({
	todayBtn: true,
	orientation: "bottom auto",
	todayHighlight: true,
	format: "yyyy-mm-dd"
});

Date.dateDiff = function (fromDate, toDate) {
	const diff = toDate - fromDate;
	const divideBy = 86400000;

	return (diff / divideBy >> 0) + 1;
};

const startInput = $('#start-date');
const dueInput = $('#due-date');
const diffLabel = $('#diff-date');

$('.date-input').on('change', function () {
	const fromDate = new Date(startInput.val());
	const toDate = new Date(dueInput.val());

	diffLabel.text(Date.dateDiff(fromDate, toDate) + ' Days');
});