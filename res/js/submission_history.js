"use strict";

const $resultTable = $('#resultTable');

const $selects = $('.selectpicker');
const $category = $('#selectCategory');
const $id = $('#selectId');
const $result = $('#selectResult');
const $email = $('#selectEmail');
const $user = $('#selectUser');


$selects.on('hide.bs.select', function (event) {
	$selects.prop('disabled', false);
	$selects.selectpicker('refresh');

	console.log($category.val());
	console.log($id.val());
	console.log($result.val());
	console.log($email.val());
	console.log($user.val());
});

const $homeworkGroup = $('#homeworkGroup');
const $exerciseGroup = $('#exerciseGroup');

$category.change(function (event) {
	if ($category.val() === 'All') {
		console.log(1);
		$homeworkGroup.show();
		$exerciseGroup.show();
	}
	else if ($category.val() === 'Homework') {
		console.log(2);
		$homeworkGroup.show();
		$exerciseGroup.hide();
	}
	else if ($category.val() === 'Exercise') {
		console.log(3);
		$homeworkGroup.hide();
		$exerciseGroup.show();
	}
});