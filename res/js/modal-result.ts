class ResultModal {
	protected $modal: JQuery;
	protected $body: JQuery;
	protected $header: JQuery;
	protected $correctBody: JQuery;
	protected $incorrectBody: JQuery;
	protected $runtimeErrorBody: JQuery;
	protected $compileErrorBody: JQuery;
	protected $timeoutBody: JQuery;
	protected $errorBody: JQuery;

	protected $inputBox: JQuery;
	protected $outputBox: JQuery;
	protected $answerBox: JQuery;

	protected $compileErrorBox: JQuery;
	protected $runtimeErrorSignal: JQuery;
	protected $runtimeErrorBox: JQuery;
	protected $runtimeErrorInputBox: JQuery;
	protected $timeoutInputBox: JQuery;
	protected $errorBox: JQuery;

	public constructor($modal: JQuery) {
		this.$modal = $modal;

		this.$body = $modal.find('.modal-body');
		this.$header = $modal.find('#resultModalLabel');
		this.$correctBody = this.$body.find('#correctBody');
		this.$incorrectBody = this.$body.find('#incorrectBody');
		this.$runtimeErrorBody = this.$body.find('#runtimeErrorBody');
		this.$compileErrorBody = this.$body.find('#compileErrorBody');
		this.$timeoutBody = this.$body.find('#timeoutBody');
		this.$errorBody = this.$body.find('#errorBody');

		this.$inputBox = this.$body.find('#inputBox');
		this.$outputBox = this.$body.find('#outputBox');
		this.$answerBox = this.$body.find('#answerBox');

		this.$compileErrorBox = this.$body.find('#compileErrorBox');
		this.$runtimeErrorSignal = this.$body.find('#runtimeErrorSignal');
		this.$runtimeErrorBox = this.$body.find('#runtimeErrorBox');
		this.$runtimeErrorInputBox = this.$body.find('#runtimeErrorInputBox');
		this.$timeoutInputBox = this.$body.find('#timeoutInputBox');
		this.$errorBox = this.$body.find('#errorBox');
	}

	public setCorrect() {
		this.$body.children().hide();
		this.$correctBody.show();

		this.$header
			.removeClass('text-danger')
			.addClass('text-success')
			.html('<i class="fa fa-check-circle" aria-hidden="true"></i> Correct !');

		this.$modal.modal();
	}

	public setIncorrect(input: string, answer: string, output: string) {
		this.$body.children().hide();
		this.$incorrectBody.show();

		this.$inputBox.text(input);
		this.$outputBox.text(output);
		this.$answerBox.text(answer);

		this.$header
			.removeClass('text-success')
			.addClass('text-danger')
			.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Incorrect !');

		this.$modal.modal();
	}

	public setTimeout(input: string) {
		this.$body.children().hide();
		this.$timeoutBody.show();

		this.$timeoutInputBox.text(input);

		this.$header
			.removeClass('text-success')
			.addClass('text-danger')
			.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Timeout !');

		this.$modal.modal();
	}

	public setRuntimeError(returnCode: number, errorLog: string, input: string) {
		this.$body.children().hide();
		this.$runtimeErrorBody.show();

		this.$runtimeErrorSignal.text(returnCode);
		this.$runtimeErrorBox.text(errorLog);
		this.$runtimeErrorInputBox.text(input);

		this.$header
			.removeClass('text-success')
			.addClass('text-danger')
			.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Runtime Error !');

		this.$modal.modal();
	}

	public setCompileError(errorMsg: string) {
		this.$body.children().hide();
		this.$compileErrorBody.show();

		this.$compileErrorBox.text(errorMsg);


		this.$header
			.removeClass('text-success')
			.addClass('text-danger')
			.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Compile Error !');

		this.$modal.modal();
	}

	public setFailToRun(errorMsg: string) {
		this.$body.children().hide();
		this.$compileErrorBody.show();

		this.$compileErrorBox.text(errorMsg.replace('/\n/g', '<br>'));


		this.$header
			.removeClass('text-success')
			.addClass('text-danger')
			.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Fail to run !');

		this.$modal.modal();
	}

	public setServerError(errorMsg:string) {
		this.$body.children().hide();
		this.$errorBody.show();

		this.$errorBox.html(errorMsg);

		this.$header
			.removeClass('text-success')
			.addClass('text-danger')
			.html('<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Something\'s wrong !');

		this.$modal.modal();
	}
}