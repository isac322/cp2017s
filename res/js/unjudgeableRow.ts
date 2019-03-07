///<reference path="historyRow.ts"/>


class UnjudgeableRow extends HistoryRow {
	public constructor(value: HistoryEntry) {
		super(value);
	}

	protected setData(value: HistoryEntry): void {
		const href = `"/${value.category.toLowerCase()}/entry/${value.logId}"`;
		let content: string;

		if (value.extension.valueOf() !== 'report' && value.extension.valueOf() !== 'zip') {
			content = `<a role='button' class="btn-link" onclick='codeModal(${href}, "${value.extension}", "${value.name}");'>${value.name}</a>`
		}
		else {
			content = value.name
		}

		this.fileTd.innerHTML =
			`${content}<a class="btn-link pull-right" href=${href} download=""><i class="fa fa-download"></i></a>`;

		this.resultTd.textContent = '';
	}
}