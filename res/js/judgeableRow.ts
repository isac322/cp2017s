///<reference path="historyRow.ts"/>
///<reference path="modal-result.ts"/>


class JudgeableRow extends HistoryRow {
	protected resultModal: ResultModal;
	protected popupToggle: HTMLAnchorElement;

	public constructor(value: HistoryEntry, resultModal: ResultModal, uploadMap: { [uploadId: number]: number },
					   entryMap: { [entryId: number]: { name: string, extension: string } }) {
		super(value);


		this.resultModal = resultModal;

		let content = '';
		for (const uploadId in uploadMap) {
			const name = entryMap[uploadMap[uploadId]].name;
			const extension = entryMap[uploadMap[uploadId]].extension;

			// language=HTML
			content +=
				`<h5><a role="button" class="btn-link" onclick="codeModal('/${value.category.toLowerCase()}/entry/${uploadId}', '${extension}', '${name}')">${name}</a></h5>`;
		}

		this.popupToggle.dataset.content = content;
	}

	protected setData(value: HistoryEntry): void {
		this.popupToggle = document.createElement('a');
		this.popupToggle.classList.add('btn-link');
		this.popupToggle.setAttribute('role', 'button');
		this.popupToggle.dataset.toggle = 'popover';
		this.popupToggle.textContent = value.name;
		$(this.popupToggle).popover({
			html: true,
			sanitize: false,
			// language=HTML
			template: '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-content"></div></div>'
		});

		const downloadBtn = document.createElement('a');
		downloadBtn.setAttribute('href', `/${value.category.toLowerCase()}/group/${value.logId}`);
		downloadBtn.setAttribute('download', '');
		// language=HTML
		downloadBtn.innerHTML = '<i class="fa fa-download"></i>';
		downloadBtn.classList.add('btn-link');
		downloadBtn.classList.add('pull-right');

		while (this.fileTd.hasChildNodes()) this.fileTd.removeChild(this.fileTd.firstChild);
		this.fileTd.appendChild(this.popupToggle);
		this.fileTd.appendChild(downloadBtn);


		if (value.result != null) {
			const strong = document.createElement('strong');
			strong.textContent = value.result;

			if (this.resultTd.hasChildNodes()) this.resultTd.removeChild(this.resultTd.firstChild);

			if (value.result == 'correct') {
				strong.classList.add('text-success');
				this.resultTd.appendChild(strong);
			}
			else {
				strong.classList.add('text-danger');

				const btn: HTMLAnchorElement = document.createElement('a');
				btn.classList.add('btn-link');
				btn.setAttribute('role', 'button');
				btn.appendChild(strong);

				const resultURL = `/${value.category.toLowerCase()}/judge/${value.logId}`;
				btn.addEventListener('click', () => this.resultModal.fetchAndShow(resultURL));

				this.resultTd.appendChild(btn);
			}
		}
		else {
			this.resultTd.textContent = 'Pending...';
		}
	}
}
