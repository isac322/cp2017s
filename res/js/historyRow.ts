interface HistoryEntry {
	created: Date,
	studentId: string,
	category: string,
	logId: string,
	problemInfoId: string,
	name: string,
	extension: string,
	result: string,
	email: string,
	// FIXME: is this syntax is right? (I mean, is the semantic is undefinedable variable?)
	userName: undefined | string
}

abstract class HistoryRow {
	public row: HTMLTableRowElement;
	protected idTd: HTMLTableHeaderCellElement;
	protected categoryTd: HTMLTableDataCellElement;
	protected fileTd: HTMLTableDataCellElement;
	protected resultTd: HTMLTableDataCellElement;
	protected timestampTd: HTMLTableDataCellElement;
	protected userTd: HTMLTableDataCellElement;

	public constructor(value: HistoryEntry) {
		this.idTd = document.createElement('th');
		this.idTd.setAttribute('scope', 'row');
		this.categoryTd = document.createElement('td');
		this.fileTd = document.createElement('td');
		this.resultTd = document.createElement('td');
		this.timestampTd = document.createElement('td');
		this.userTd = document.createElement('td');

		this.categoryTd.setAttribute('class', 'categoryCol');
		this.resultTd.setAttribute('class', 'resultCol');


		this.row = document.createElement('tr');

		this.row.appendChild(this.idTd);
		this.row.appendChild(this.categoryTd);
		this.row.appendChild(this.fileTd);
		this.row.appendChild(this.resultTd);
		this.row.appendChild(this.timestampTd);
		this.row.appendChild(this.userTd);


		this.setData(value);


		this.idTd.textContent = String(value.logId);
		this.categoryTd.textContent = value.category;

		this.timestampTd.textContent = new Date(value.created).toLocaleString(undefined, {
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});

		if (this.userTd.hasChildNodes()) this.userTd.removeChild(this.userTd.firstChild);
		if (value.userName) {
			const userBtn = document.createElement('z');
			userBtn.classList.add('btn-link');
			userBtn.setAttribute('role', 'button');

			userBtn.textContent = decodeURIComponent(value.userName);
			$(userBtn).tooltip({
				title: value.email,
				placement: 'top'
			});

			this.userTd.appendChild(userBtn);
		}
		else {
			this.userTd.classList.add('emailCol');
			this.userTd.textContent = value.email;
		}
	}

	protected abstract setData(value: HistoryEntry): void;
}
