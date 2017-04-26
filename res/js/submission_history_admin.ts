///<reference path="modal-result.ts"/>

namespace SubmissionHistoryAdmin {
	const $resultTable = $('#resultTable');

	const $selects = $('.selectpicker');

	const $category = $('#selectCategory');
	const $result = $('#selectResult');
	const $email = $('#selectEmail');
	const $user = $('#selectUser');


	let prevQuery = location.search;

	let rows: Array<Row> = [];

	class Data {
		id: number;
		result: number;
		email: string;
		fileName: string;
		timestamp: string;
		extension: string;
		studentId: string;
		category: string;
		name: string;
	}

	const queryHandler = (data: Array<Data>) => {
		$resultTable.children().detach();

		for (let i = 0; i < data.length; i++) {
			if (i >= rows.length)
				rows.push(new Row(data[i]));
			else
				rows[i].setData(data[i]);

			$resultTable.append(rows[i].row);
		}

		const $categoryCol = $('.categoryCol');

		switch ($category.val()) {
			case '3':
				$categoryCol.show();
				break;

			case '1':
				$categoryCol.hide();
				break;

			case '2':
				$categoryCol.hide();
		}

		$selects.prop('disabled', false);
		$selects.selectpicker('refresh');
	};

	class Row {
		private static RESULTS = ['Correct', 'Incorrect', 'Compile Error', 'Timeout', 'Runtime Error', 'Fail to run'];
		id: number;
		category: string;
		result: number;
		email: string;
		fileName: string;
		timestamp: string;
		extension: string;
		studentId: string;
		userName: string;

		row: HTMLTableRowElement;
		private idTd: HTMLTableHeaderCellElement;
		private categoryTd: HTMLTableDataCellElement;
		private fileTd: HTMLTableDataCellElement;
		private resultTd: HTMLTableDataCellElement;
		private timestampTd: HTMLTableDataCellElement;
		private emailTd: HTMLTableDataCellElement;
		private userTd: HTMLTableDataCellElement;

		public constructor(value: Data) {
			this.idTd = document.createElement('th');
			this.idTd.setAttribute('scope', 'row');
			this.categoryTd = document.createElement('td');
			this.fileTd = document.createElement('td');
			this.resultTd = document.createElement('td');
			this.timestampTd = document.createElement('td');
			this.emailTd = document.createElement('td');
			this.userTd = document.createElement('td');

			this.setData(value);

			this.row = document.createElement('tr');

			this.row.appendChild(this.idTd);
			this.row.appendChild(this.categoryTd);
			this.row.appendChild(this.fileTd);
			this.row.appendChild(this.resultTd);
			this.row.appendChild(this.timestampTd);
			this.row.appendChild(this.emailTd);
			this.row.appendChild(this.userTd);
		}

		public setData(value: Data) {
			this.id = value.id;
			this.category = value.category;
			this.result = value.result;
			this.email = value.email;
			this.fileName = value.fileName;
			this.timestamp = value.timestamp;
			this.extension = value.extension;
			this.studentId = value.studentId;
			this.userName = value.name;

			this.idTd.textContent = String(this.id);
			this.categoryTd.textContent = this.category;


			const href = (this.category == 'Homework' ? '"/homework/' : '"/exercise/') + this.id + '"';

			let content: string;

			if (this.extension.valueOf() !== 'report' && this.extension.valueOf() !== 'zip') {
				content = '<button class="btn-link tdLinkBtn" onclick=\'codeModal(' + href + ', "' + this.extension + '", "' + this.fileName + '");\'>' + this.fileName + '</button>'
			} else {
				content = this.fileName
			}

			this.fileTd.innerHTML =
				content + '<a class="btn-link pull-right" href=' + href + '><i class="fa fa-download"></i></a>';


			if (this.result != null) {
				if (this.result == 0)
					this.resultTd.innerHTML = '<strong class="text-success">' + Row.RESULTS[this.result] + '</strong>';
				else
					this.resultTd.innerHTML = '<button class="btn-link tdLinkBtn" onclick="SubmissionHistoryAdmin.onResult(' + this.id + ');">' +
						'<strong class="text-danger">' + Row.RESULTS[this.result] + '</strong></button>';
			}
			else if (this.category == 'Homework') {
				this.resultTd.textContent = '';
			}
			else {
				this.resultTd.textContent = 'Pending...';
			}
			this.timestampTd.textContent = new Date(this.timestamp).toLocaleString();
			this.emailTd.textContent = this.email;
			this.userTd.textContent = decodeURIComponent(this.userName);

			this.categoryTd.setAttribute('class', 'categoryCol');
		}
	}

	$selects.on('hide.bs.select', () => {
		$selects.prop('disabled', true);
		$selects.selectpicker('refresh');

		const newQuery = genQuery();

		if (prevQuery !== newQuery) {
			$.ajax('/history/list' + genQuery(), {success: queryHandler});
			prevQuery = newQuery;
		}
		else {
			$selects.prop('disabled', false);
			$selects.selectpicker('refresh');
		}
	});

	const $homeworkGroup = $('#homeworkGroup');
	const $exerciseGroup = $('#exerciseGroup');

	const $resultGroup = $('#resultGroup');

	$category.change(() => {
		switch ($category.val()) {
			case '3':
				$homeworkGroup.children().show();
				$exerciseGroup.children().show();
				$resultGroup.show();
				break;

			case '1':
				$homeworkGroup.children().show();
				$exerciseGroup.children().prop('selected', false).hide();
				$resultGroup.hide();
				break;

			case '2':
				$homeworkGroup.children().prop('selected', false).hide();
				$exerciseGroup.children().show();
				$resultGroup.show();
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


	$.ajax('/history/list' + prevQuery, {success: queryHandler});

	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
		$('.selectpicker:not(#selectUser)').selectpicker('mobile');
	}

	const resultModal = new ResultModal($('#resultModal'));

	export function onResult(id: number) {
		$.ajax('/exercise/result/' + id, {
			complete: (jqXHR: JQueryXHR) => {
				const res = jqXHR.responseJSON;

				switch (jqXHR.status) {
					// dose not sign in yet
					case 401:
						document.location.href = '/';
						break;

					// correct
					case 200:
						resultModal.setCorrect();
						break;

					// incorrect
					case 406:
						resultModal.setIncorrect(res.input, res.answerOutput, res.userOutput);
						break;

					// timeout
					case 410:
						resultModal.setTimeout(res.input);
						break;

					// runtime error
					case 412:
						resultModal.setRuntimeError(res.returnCode, res.errorLog, res.input);
						break;

					// compile error
					case 400:
						resultModal.setCompileError(res.errorMsg);
						break;

					// fail to run
					case 417:
						resultModal.setFailToRun(res.errorMsg.replace('/\n/g', '<br>'));
						break;

					// server error
					case 500:
						resultModal.setServerError('Some error occurs on the judging server. Please contact to web administrator with your error ID : <code>' + res.id + '</code>.');
						break;

				}
			}
		})
	}
}