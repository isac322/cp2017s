$('#date_picker').datepicker({
	todayBtn: true,
	orientation: "bottom auto",
	todayHighlight: true,
	format: "yyyy-mm-dd"
});

Date.dateDiff = function (fromDate, toDate) {
	const diff = toDate - fromDate;
	const divideBy = 86400000;

	return Math.floor(diff / divideBy) + 1;
};

$('.date-input').change(function () {
	const fromArr = $('#start-date').val().split('/');
	const toArr = $('#due-date').val().split('/');

	const fromDate = new Date(fromArr[2], fromArr[0] - 1, fromArr[1]);
	const toDate = new Date(toArr[2], toArr[0] - 1, toArr[1]);

	$('#diff-date').text(Date.dateDiff(fromDate, toDate) + ' Days');
});