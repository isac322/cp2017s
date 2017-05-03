///<reference path="modal-result.ts"/>

namespace SubmissionHistoryAdmin {
	const MAX_PAGE = document.documentElement.clientWidth >= 768 ? 10 : 5;

	interface RowData {
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
		private userBtn: HTMLButtonElement;

		public constructor(value: RowData) {
			this.idTd = document.createElement('th');
			this.idTd.setAttribute('scope', 'row');
			this.categoryTd = document.createElement('td');
			this.fileTd = document.createElement('td');
			this.resultTd = document.createElement('td');
			this.timestampTd = document.createElement('td');
			this.emailTd = document.createElement('td');
			this.userTd = document.createElement('td');
			this.userBtn = document.createElement('button');

			this.userBtn.setAttribute('class', 'btn-link tdLinkBtn');
			this.userBtn.setAttribute('type', 'button');
			this.userBtn.dataset.toggle = 'tooltip';
			this.userBtn.dataset.placement = 'top';

			this.categoryTd.setAttribute('class', 'categoryCol');
			this.resultTd.setAttribute('class', 'resultCol');
			this.emailTd.setAttribute('class', 'emailCol');


			this.userTd.appendChild(this.userBtn);

			this.row = document.createElement('tr');

			this.row.appendChild(this.idTd);
			this.row.appendChild(this.categoryTd);
			this.row.appendChild(this.fileTd);
			this.row.appendChild(this.resultTd);
			this.row.appendChild(this.timestampTd);
			this.row.appendChild(this.emailTd);
			this.row.appendChild(this.userTd);


			this.setData(value);
		}

		public setData(value: RowData) {
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
			}
			else {
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
			else if (this.category != 'Exercise') {
				this.resultTd.textContent = '';
			}
			else {
				this.resultTd.textContent = 'Pending...';
			}
			this.timestampTd.textContent = new Date(this.timestamp).toLocaleString();
			this.emailTd.textContent = this.email;
			this.userBtn.textContent = decodeURIComponent(this.userName);

			this.userBtn.dataset.originalTitle = this.email;
			$(this.userBtn).tooltip();
		}
	}

	const $resultTable: JQuery = $('#resultTable');
	const $result: JQuery = $('#selectResult');
	const $email: JQuery = $('#selectEmail');
	const $user: JQuery = $('#selectUser');

	let rows: Array<Row> = [];

	function queryHandler(res: { data: Array<RowData>, total: number, p: number }): void {
		$resultTable.children().detach();

		for (let i = 0; i < res.data.length; i++) {
			if (i >= rows.length) {
				rows.push(new Row(res.data[i]));
			}
			else {
				rows[i].setData(res.data[i]);
			}

			$resultTable.append(rows[i].row);
		}

		const $categoryCol = $('.categoryCol');
		const $resultCol = $('.resultCol');
		const $emailCol = $('.emailCol');

		if ($category.val() === '0' || $category.val() === '2') {
			$resultCol.show();
		}
		else {
			$resultCol.hide();
		}

		if ($category.val() === '0') {
			$categoryCol.show();
		}
		else {
			$categoryCol.hide();
		}

		if ($email.children().length == 1) {
			$emailCol.hide();
		}


		let i = Math.floor((res.p / MAX_PAGE)) * MAX_PAGE, j = 0;
		for (; i < res.total && j < MAX_PAGE; i++, j++) {
			pageLink[j].li
				.removeClass('active')
				.data('val', i)
				.show();
			pageLink[j].a.text(i + 1);
		}

		for (; j < MAX_PAGE; j++) pageLink[j].li.hide();


		pageLink[res.p % MAX_PAGE].li.addClass('active');

		if (res.p < MAX_PAGE) $prevPage.addClass('disabled');
		else $prevPage.removeClass('disabled');

		if (res.total - res.p <= MAX_PAGE) $nextPage.addClass('disabled');
		else $nextPage.removeClass('disabled');

		$selects.prop('disabled', false);
		$selects.selectpicker('refresh');
	}

	function send(pageNum?: number): void {
		$selects.prop('disabled', true);
		$selects.selectpicker('refresh');

		if (pageNum == null) pageNum = 0;
		const newQuery = genQuery() + 'p=' + pageNum;

		if (prevQuery !== newQuery) {
			$.ajax('/history/list' + newQuery, {success: queryHandler});
			prevQuery = newQuery;
		}
		else {
			$selects.prop('disabled', false);
			$selects.selectpicker('refresh');
		}
	}

	function genQuery(): string {
		// homework
		let homeworkQuery = '';
		$homeworkGroup.children(':selected').each((index: number, elem: HTMLOptionElement) => {
			homeworkQuery += 'hw=' + elem.value.substr(1) + '&';
		});

		// exercise
		let exerciseQuery = '';
		$exerciseGroup.children(':selected').each((index: number, elem: HTMLOptionElement) => {
			exerciseQuery += 'ex=' + elem.value.substr(1) + '&';
		});

		// exercise
		let projectQuery = '';
		$projectGroup.children(':selected').each((index: number, elem: HTMLOptionElement) => {
			projectQuery += 'pj=' + elem.value.substr(1) + '&';
		});

		// result
		let resultQuery = '';
		$result.children(':selected').each((index: number, elem: HTMLOptionElement) => {
			resultQuery += 'r=' + elem.value + '&';
		});

		// email
		let emailQuery = '';
		$email.children(':selected').each((index: number, elem: HTMLOptionElement) => {
			emailQuery += 'e=' + elem.value + '&';
		});

		// user
		let userQuery = '';
		$user.children(':selected').each((index: number, elem: HTMLOptionElement) => {
			userQuery += 'u=' + elem.value + '&';
		});

		return '?t=' + $category.val() + '&' + homeworkQuery + exerciseQuery + projectQuery + resultQuery + emailQuery + userQuery;
	}

	export function onResult(id: number) {
		const resultModal = new ResultModal($('#resultModal'));

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

	/*
	 for Pagination
	 */
	const $pageUL: JQuery = $('#page-ul');
	const $prevPage: JQuery = $('#page-prev');
	const $nextPage: JQuery = $('#page-next');

	$prevPage.click((e: JQueryEventObject) => {
		if ($prevPage.hasClass('disabled')) {
			e.preventDefault();
		}
		else {
			send($pageUL.children(':nth-child(2)').data('val') - 1);
		}
	});

	$nextPage.click((e: JQueryEventObject) => {
		if ($nextPage.hasClass('disabled')) {
			e.preventDefault();
		}
		else {
			send($pageUL.children(':nth-last-child(2)').data('val') + 1);
		}
	});


	let pageLink: Array<{ li: JQuery, a: JQuery }> = [];

	for (let i = 0; i < MAX_PAGE; i++) {
		const li = document.createElement('li');
		const a = document.createElement('a');
		a.setAttribute('href', '#');
		a.addEventListener('click', (e: Event) => send($(e.target).parent().data('val')));
		li.appendChild(a);
		pageLink.push({li: $(li), a: $(a)});

		$nextPage.before(li)
	}


	const $selects: JQuery = $('.selectpicker');

	const $category: JQuery = $('#selectCategory');


	$selects.on('hide.bs.select', () => send());

	const $homeworkGroup: JQuery = $('#homeworkGroup');
	const $exerciseGroup: JQuery = $('#exerciseGroup');
	const $projectGroup: JQuery = $('#projectGroup');
	const $resultGroup: JQuery = $('#resultGroup');

	$category.change(() => {
		switch ($category.val()) {
			case '0':
				$homeworkGroup.children().show();
				$exerciseGroup.children().show();
				$projectGroup.children().show();
				$resultGroup.show();
				break;

			case '1':
				$homeworkGroup.children().show();
				$exerciseGroup.children().prop('selected', false).hide();
				$projectGroup.children().prop('selected', false).hide();
				$resultGroup.hide();
				break;

			case '2':
				$homeworkGroup.children().prop('selected', false).hide();
				$exerciseGroup.children().show();
				$projectGroup.children().prop('selected', false).hide();
				$resultGroup.show();
				break;

			case '3':
				$homeworkGroup.children().prop('selected', false).hide();
				$exerciseGroup.children().prop('selected', false).hide();
				$projectGroup.children().show();
				$resultGroup.hide();
		}

		$selects.selectpicker('refresh');
	});

	if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
		$('.selectpicker:not(#selectUser)').selectpicker('mobile');

		$selects.focusout(() => send());
	}

	let prevQuery;

	if (location.search == '') prevQuery = '?t=0&';
	else {
		prevQuery = location.search;

		interface ParsedQuery {
			t: string[];
			hw: string[];
			ex: string[];
			pj: string[];
			r: string[];
			e: string[];
			u: string[];
		}

		const ret: ParsedQuery = location.search.substr(1).split('&')
			.filter((e: string) => e != '')
			.map((e: string) => e.split('='))
			.reduce((prev: ParsedQuery, curr: string[]) => {
				prev[curr[0]].push(curr[1]);
				return prev;
			}, {t: [], hw: [], ex: [], pj: [], r: [], e: [], u: []});

		ret.hw = ret.hw.map(((value: string) => 'h' + value));
		ret.ex = ret.ex.map(((value: string) => 'e' + value));
		ret.pj = ret.pj.map(((value: string) => 'p' + value));

		$category.val(ret.t).change();
		$('#selectId').selectpicker('val', ret.hw.concat(ret.ex, ret.pj));
		$result.selectpicker('val', ret.r);
		$email.selectpicker('val', ret.e);
		$user.selectpicker('val', ret.u);
	}

	send();
}