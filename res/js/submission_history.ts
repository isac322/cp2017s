const $resultTable = $('#resultTable');

const $selects = $('.selectpicker');

const $category = $('#selectCategory');
const $id = $('#selectId');
const $result = $('#selectResult');
const $email = $('#selectEmail');
const $user = $('#selectUser');


let prevQuery = '';

const queryHandler = {
	200: (data: Object) => {
		console.log(data);
	}
};

class Row {
	private id: number;
	private result: number;
	private email: string;
	private fileName: string;
	private hashedName: string;
	private timestamp: string;
	private extension: string;
	private studentId: string;

	private row: HTMLTableRowElement;
	private idTd: HTMLTableHeaderCellElement;
	private categoryTd: HTMLTableDataCellElement;
	private fileTd: HTMLTableDataCellElement;
	private resultTd: HTMLTableDataCellElement;
	private timestampTd: HTMLTableDataCellElement;
	private emailTd: HTMLTableDataCellElement;
	private userTd: HTMLTableDataCellElement;

	constructor(id, result, email, fileName, hashedName, timestamp, extension, studentId) {
		this.id = id;
		this.result = result;
		this.email = email;
		this.fileName = fileName;
		this.hashedName = hashedName;
		this.timestamp = timestamp;
		this.extension = extension;
		this.studentId = studentId;

		this.row = document.createElement('tr');
		this.idTd = document.createElement('th');
		this.categoryTd = document.createElement('td');
		this.fileTd = document.createElement('td');
		this.resultTd = document.createElement('td');
		this.timestampTd = document.createElement('td');
		this.emailTd = document.createElement('td');
		this.userTd = document.createElement('td');
	}
}

$selects.on('hide.bs.select', () => {
	$selects.prop('disabled', false);
	$selects.selectpicker('refresh');

	const newQuery = genQuery();

	if (prevQuery !== newQuery) {
		$.ajax('history/list' + genQuery(), {statusCode: queryHandler});
		prevQuery = newQuery;
	}
});

const $homeworkGroup = $('#homeworkGroup');
const $exerciseGroup = $('#exerciseGroup');

$category.change(() => {
	switch ($category.val()) {
		case 'All':
			$homeworkGroup.children().show();
			$exerciseGroup.children().show();
			break;

		case 'Homework':
			$homeworkGroup.children().show();
			$exerciseGroup.children().prop("selected", false).hide();
			break;

		case 'Exercise':
			$homeworkGroup.children().prop("selected", false).hide();
			$exerciseGroup.children().show();
	}

	$selects.selectpicker('refresh');
});


function genQuery(): string {
	// homework
	let homeworkQuery = '';
	$homeworkGroup.children(':selected').each((index: number, elem: HTMLOptionElement) => {
		homeworkQuery += 'hw=' + elem.value + '&';
	});

	// exercise
	let exerciseQuery = '';
	$exerciseGroup.children(':selected').each((index: number, elem: HTMLOptionElement) => {
		exerciseQuery += 'ex=' + elem.value + '&';
	});

	// result
	let resultQuery = '';
	$result.children(':selected').each((index: number, elem: HTMLOptionElement) => {
		resultQuery += 'r=' + elem.value + '&';
	});

	// result
	let emailQuery = '';
	$email.children(':selected').each((index: number, elem: HTMLOptionElement) => {
		emailQuery += 'e=' + elem.value + '&';
	});

	// user
	let userQuery = '';
	$user.children(':selected').each((index: number, elem: HTMLOptionElement) => {
		userQuery += 'u=' + elem.value + '&';
	});

	return '?' + homeworkQuery + exerciseQuery + resultQuery + emailQuery + userQuery;
}