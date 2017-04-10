"use strict";

const $resultTable = $('#resultTable');

const $selects = $('.selectpicker');

const $category = $('#selectCategory');
const $id = $('#selectId');
const $result = $('#selectResult');
const $email = $('#selectEmail');
const $user = $('#selectUser');


let prevQuery = '';

$selects.on('hide.bs.select', function (event) {
	$selects.prop('disabled', false);
	$selects.selectpicker('refresh');

	const newQuery = genQuery();

	if (prevQuery !== newQuery) {
		$.ajax(origin + '/history/list' + genQuery());
		prevQuery = newQuery;
	}
});

const $homeworkGroup = $('#homeworkGroup');
const $exerciseGroup = $('#exerciseGroup');

$category.change(function (event) {
	const origin = location.protocol + '//' + location.host;

	if ($category.val() === 'All') {
		$homeworkGroup.children().show();
		$exerciseGroup.children().show();
	}
	else if ($category.val() === 'Homework') {
		$homeworkGroup.children().show();
		$exerciseGroup.children().prop("selected", false).hide();
	}
	else if ($category.val() === 'Exercise') {
		$homeworkGroup.children().prop("selected", false).hide();
		$exerciseGroup.children().show();
	}
	$selects.selectpicker('refresh');
});


function genQuery() {
	// homework
	let homeworkQuery = '';
	$homeworkGroup.children(':selected').each(function (index, elem) {
		homeworkQuery += 'hw=' + elem.value + '&';
	});

	// exercise
	let exerciseQuery = '';
	$exerciseGroup.children(':selected').each(function (index, elem) {
		exerciseQuery += 'ex=' + elem.value + '&';
	});

	// result
	let resultQuery = '';
	$result.children(':selected').each(function (index, elem) {
		resultQuery += 'r=' + elem.value + '&';
	});

	// result
	let emailQuery = '';
	$email.children(':selected').each(function (index, elem) {
		emailQuery += 'e=' + elem.value + '&';
	});

	// user
	let userQuery = '';
	$user.children(':selected').each(function (index, elem) {
		userQuery += 'u=' + elem.value + '&';
	});

	return '?' + homeworkQuery + exerciseQuery + resultQuery + emailQuery + userQuery;
}