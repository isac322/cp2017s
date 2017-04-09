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