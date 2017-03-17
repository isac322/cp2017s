$('.upload-form').validator().on('submit', function (e) {
	if (!e.isDefaultPrevented()) {
		const $form = $(this);
		const form = this;
		const $btn = $form.find('button:last');

		e.preventDefault();

		$btn.button('loading');

		$form.ajaxSubmit({
			statusCode: {
				202: function () {
					console.log(202);
					$btn.button('reset');
					form.reset();
					$form.validator('validate');
				}
			}
		});
	}
});