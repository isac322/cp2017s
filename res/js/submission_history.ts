const $resultTable = $('#resultTable');

const $selects = $('.selectpicker');

const $category = $('#selectCategory');
const $id = $('#selectId');
const $result = $('#selectResult');
const $email = $('#selectEmail');


let prevQuery = location.search;

let rows: Array<Row> = [];

class Data {
	id: number;
	result: number;
	email: string;
	fileName: string;
	hashedName: string;
	timestamp: string;
	extension: string;
	studentId: string;
}

const queryHandler = (data: Array<Data>) => {
	$resultTable.children().detach();

	data.forEach((value: Data, index: number) => {
		if (index >= rows.length) {
			rows.push(new Row(value, 'Exercise'));
		}
		else {
			rows[index].setData(value, 'Exercise');
		}

		$resultTable.append(rows[index].row);
	});
};

class Row {
	private static RESULTS = ['Correct', 'Incorrect', 'Compile Error', 'Timeout', 'Runtime Error', 'Fail to run'];
	id: number;
	category: string;
	result: number;
	email: string;
	fileName: string;
	hashedName: string;
	timestamp: string;
	extension: string;
	studentId: string;

	row: HTMLTableRowElement;
	private idTd: HTMLTableHeaderCellElement;
	private categoryTd: HTMLTableDataCellElement;
	private fileTd: HTMLTableDataCellElement;
	private resultTd: HTMLTableDataCellElement;
	private timestampTd: HTMLTableDataCellElement;
	private emailTd: HTMLTableDataCellElement;

	public constructor(value: Data, category: string) {
		this.idTd = document.createElement('th');
		this.idTd.setAttribute('scope', 'row');
		this.categoryTd = document.createElement('td');
		this.fileTd = document.createElement('td');
		this.resultTd = document.createElement('td');
		this.timestampTd = document.createElement('td');
		this.emailTd = document.createElement('td');

		this.setData(value, category);

		this.row = document.createElement('tr');

		this.row.appendChild(this.idTd);
		this.row.appendChild(this.categoryTd);
		this.row.appendChild(this.fileTd);
		this.row.appendChild(this.resultTd);
		this.row.appendChild(this.timestampTd);
		this.row.appendChild(this.emailTd);
	}

	public setData(value: Data, category: string) {
		this.id = value.id;
		this.category = category;
		this.result = value.result;
		this.email = value.email;
		this.fileName = value.fileName;
		this.hashedName = value.hashedName;
		this.timestamp = value.timestamp;
		this.extension = value.extension;
		this.studentId = value.studentId;

		this.idTd.textContent = String(this.id);
		this.categoryTd.textContent = this.category;
		this.fileTd.textContent = this.fileName;
		this.resultTd.textContent = Row.RESULTS[this.result];
		this.timestampTd.textContent = new Date(this.timestamp).toLocaleString();
		this.emailTd.textContent = this.email;

		this.categoryTd.setAttribute('class', 'categoryCol');
	}
}

$selects.on('hide.bs.select', () => {
	$selects.prop('disabled', true);
	$selects.selectpicker('refresh');

	const newQuery = genQuery();

	console.log(newQuery, prevQuery);

	if (prevQuery !== newQuery) {
		$.ajax('history/list' + genQuery(), {success: queryHandler});
		prevQuery = newQuery;

		$selects.prop('disabled', false);
		$selects.selectpicker('refresh');
	}
});

const $homeworkGroup = $('#homeworkGroup');
const $exerciseGroup = $('#exerciseGroup');

$category.change(() => {
	switch ($category.val()) {
		case 3:
			$homeworkGroup.children().show();
			$exerciseGroup.children().show();
			break;

		case 1:
			$homeworkGroup.children().show();
			$exerciseGroup.children().prop("selected", false).hide();
			break;

		case 2:
			$homeworkGroup.children().prop("selected", false).hide();
			$exerciseGroup.children().show();
	}

	$selects.selectpicker('hide');
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

	return '?t=' + $category.val() + '&' + homeworkQuery + exerciseQuery + resultQuery + emailQuery;
}


$.ajax('history/list' + prevQuery, {success: queryHandler});