///<reference path="modal-result.ts"/>
///<reference path="historyRow.ts"/>
///<reference path="judgeableRow.ts"/>
///<reference path="unjudgeableRow.ts"/>



namespace SubmissionHistory {
	interface ReceivedData {
		data: HistoryEntry[],
		exerciseInfoMap: { [key: number]: { [key: number]: number } },
		exerciseEntryMap: { [key: number]: { name: string, extension: string } },
		total: number,
		p: number
	}

	const MAX_PAGE = document.documentElement.clientWidth >= 768 ? 10 : 5;

	const $resultTable: JQuery = $('#resultTable');
	const $result: JQuery = $('#selectResult');
	const $email: JQuery = $('#selectEmail');
	const $user: JQuery = $('#selectUser');
	const $emailBox: JQuery = $('#emailBox');
	const resultModal = new ResultModal($('#resultModal'));

	let currPage = 0;
	let currQuery: string;

	function queryHandler(res: ReceivedData, force?: boolean): void {
		updateTable(res);

		if (force) history.replaceState(res, '', currQuery);
		else history.pushState(res, '', currQuery);
	}

	function updateTable(res: ReceivedData): void {
		$resultTable.children().empty();

		for (const data of res.data) {
			const row = data.category == 'Exercise' ?
				new JudgeableRow(data, resultModal, res.exerciseInfoMap[Number(data.logId)], res.exerciseEntryMap) :
				new UnjudgeableRow(data);

			$resultTable.append(row.row);
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
			$emailBox.hide();

			if ($user.length == 0) $emailCol.hide();
		}


		let i = res.p - res.p % MAX_PAGE, j = 0;
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

		if ((res.total - 1) / MAX_PAGE >> 0 == res.p / MAX_PAGE >> 0) $nextPage.addClass('disabled');
		else $nextPage.removeClass('disabled');

		currPage = res.p;

		$selects.prop('disabled', false);
		$selects.selectpicker('refresh');
	}

	function updateSelect() {
		currQuery = location.search == '' ? '?t=0&' : location.search;

		interface ParsedQuery {
			t: string[];
			hw: string[];
			ex: string[];
			pj: string[];
			r: string[];
			e: string[];
			u: string[];

			[key: string]: string[];
		}

		const ret: ParsedQuery = currQuery.substr(1).split('&')
			.filter(e => e != '')
			.map(e => e.split('='))
			.reduce((prev: ParsedQuery, curr: [string, string]) => {
				if (curr[0] == 'p') return prev;

				prev[curr[0]].push(curr[1]);
				return prev;
			}, {t: [], hw: [], ex: [], pj: [], r: [], e: [], u: []});

		ret.hw = ret.hw.map(value => 'h' + value);
		ret.ex = ret.ex.map(value => 'e' + value);
		ret.pj = ret.pj.map(value => 'p' + value);

		$category.val(ret.t).change();
		$('#selectId').selectpicker('val', ret.hw.concat(ret.ex, ret.pj));
		$result.selectpicker('val', ret.r);
		$email.selectpicker('val', ret.e);
		$user.selectpicker('val', ret.u);
	}

	function fetchData(pageNum: number, force = false): void {
		$selects.prop('disabled', true);
		$selects.selectpicker('refresh');

		const newQuery = genQuery() + 'p=' + pageNum;

		if (force || currQuery !== newQuery) {
			$.ajax(`/history/list${newQuery}`, {
				success: data => queryHandler(data, force),
				error: (jqXHR: JQueryXHR) => {
					switch (jqXHR.status) {
						case 401:
							document.location.href = '/';
					}
				}
			});
			currQuery = newQuery;
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

	/*
	 for Pagination
	 */
	const $pageUL: JQuery = $('#page-ul');
	const $prevPage: JQuery = $('#page-prev');
	const $nextPage: JQuery = $('#page-next');

	$prevPage.click((e: JQuery.ClickEvent<HTMLLIElement>) => {
		if ($prevPage.hasClass('disabled')) {
			e.preventDefault();
		}
		else {
			fetchData($pageUL.children(':nth-child(2)').data('val') - 1);
		}
	});

	$nextPage.click((e: JQuery.ClickEvent<HTMLLIElement>) => {
		if ($nextPage.hasClass('disabled')) {
			e.preventDefault();
		}
		else {
			fetchData($pageUL.children(':nth-last-child(2)').data('val') + 1);
		}
	});


	let pageLink: Array<{ li: JQuery, a: JQuery }> = [];

	for (let i = 0; i < MAX_PAGE; i++) {
		const li = document.createElement('li');
		const a = document.createElement('a');
		a.addEventListener('click', (e: Event) => fetchData($(e.target).parent().data('val')));
		li.appendChild(a);
		pageLink.push({li: $(li), a: $(a)});

		$nextPage.before(li)
	}


	const $selects: JQuery = $('.selectpicker');

	const $category: JQuery = $('#selectCategory');


	$selects.on('hide.bs.select', () => fetchData(currPage));

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

		$selects.focusout(() => fetchData(currPage));
	}

	window.onpopstate = (e: PopStateEvent) => {
		updateSelect();
		updateTable(e.state);
	};

	updateSelect();
	fetchData(currPage, true);
}