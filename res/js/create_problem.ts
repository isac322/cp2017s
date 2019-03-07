namespace CreateProblem {
	function updateValidator() {
		$form.find('input')
			.removeAttr('data-validate')
			.prop('disabled', false);

		$(`.${HIDDEN} input`)
			.attr('data-validate', 'false')
			.prop('disabled', true);

		$form.validator('update');
	}

	const HIDDEN = 'validator-hidden';

	const $form = $('#create-form');
	const $descContainer = $('#description-container');
	const $groupContainer = $('#group-container');
	const $addGroup = $('#btn-add-group');

	const $DESCRIPTION_ELEM = $descContainer.children().first().clone().hide();


	$(`.${HIDDEN} input`)
		.attr('data-validate', 'false')
		.prop('disabled', true);

	// TODO: the length of arg and stdin must same
	$form.validator({
		custom: {
			input: ($input: JQuery<HTMLInputElement>) => {
				const $output = $input.closest('.form-group').find('input.upload-entry.output-file');

				if (($output[0] as HTMLInputElement).files.length != $input[0].files.length) {
					return 'number of input file is not match with output\'s'
				}
			},
			output: ($output: JQuery<HTMLInputElement>) => {
				const $input = $output.closest('.form-group').find('input.upload-entry.input-file');

				if (($input[0] as HTMLInputElement).files.length != $output[0].files.length) {
					return 'number of output file is not match with input\'s'
				}
			}
		}
	});

	// add description
	$('#btn-add-desc').on('click', () => {
		$DESCRIPTION_ELEM
			.clone()
			.appendTo($descContainer)
			.fadeIn(300);

		$form.validator('update');
	});


	// add group
	$addGroup.on('click', () => {
		const $newGroup = $groupContainer.children().first()
			.clone()
			.hide();

		$addGroup.parent().before($newGroup);
		$newGroup
			.fadeIn(300)
			.find('input:text').val('');

		$form.validator('update');
	});


	$form
	// before submit
		.on('submit', () => {
			$groupContainer.children().each((groupIdx, elem) => {
				const $group = $(elem);

				$group.find('.subtitle').attr('name', `groups[${groupIdx}][subtitle]`);
				$group.find('.compile_type').attr('name', `groups[${groupIdx}][type]`);
				$group.find('.entry_point').attr('name', `groups[${groupIdx}][entryPoint]`);
				$group.find('.compile_only').attr('name', `groups[${groupIdx}][compileOnly]`);
				$group.find('.time_limit').attr('name', `groups[${groupIdx}][timeLimit]`);
				$group.find('.chbox-arg').attr('name', `groups[${groupIdx}][throughArg]`);
				$group.find('.arg-only .input-file').attr('name', `groups[${groupIdx}][argInput][]`);
				$group.find('.arg-only .output-file').attr('name', `groups[${groupIdx}][argOutput][]`);
				$group.find('.chbox-stdin').attr('name', `groups[${groupIdx}][throughStdin]`);
				$group.find('.stdin-only .input-file').attr('name', `groups[${groupIdx}][stdInput][]`);
				$group.find('.stdin-only .output-file').attr('name', `groups[${groupIdx}][stdOutput][]`);

				$group.find('#attach-list').children().each((idx, elem) => {
					const $li = $(elem);

					$li.find('.file-name').attr('name', `groups[${groupIdx}][entries][${idx}][name]`);
					$li.find('.extension').attr('name', `groups[${groupIdx}][entries][${idx}][extension]`);
				});
			});
		})

		// delete description
		.on('click', '.btn-del-desc', e => {
			const $group = $(e.target).closest('.form-group');
			$group.fadeOut(200, () => {
				$group.remove();
				$form.validator('update');
			});
		})

		// compile only checkbox handler
		.on('change', '.compile_only', (e: JQuery.ChangeEvent<HTMLInputElement>) => {
			const $parent = $(e.target).closest('.panel-body');

			if (e.target.checked) {
				$parent.find('.exec-only')
					.fadeOut(200)
					.addClass(HIDDEN)
			}
			else {
				$parent.find('.exec-only')
					.fadeIn(200)
					.removeClass(HIDDEN)
			}

			updateValidator()
		})

		// argument checkbox handler
		.on('change', '.chbox-arg', (e: JQuery.ChangeEvent<HTMLInputElement>) => {
			// FIXME: relative path
			const $argOnly = $(e.target).parent().parent().next();

			if (e.target.checked) {
				$argOnly
					.fadeIn(200)
					.removeClass(HIDDEN)
			}
			else {
				$argOnly
					.fadeOut(200)
					.addClass(HIDDEN)
			}

			updateValidator()
		})

		// stdin checkbox handler
		.on('change', '.chbox-stdin', (e: JQuery.ChangeEvent<HTMLInputElement>) => {
			// FIXME: relative path
			const $stdinOnly = $(e.target).parent().parent().next();

			if (e.target.checked) {
				$stdinOnly
					.fadeIn(200)
					.removeClass(HIDDEN)
			}
			else {
				$stdinOnly
					.fadeOut(200)
					.addClass(HIDDEN)
			}

			updateValidator()
		})

		// compile type selector handler
		.on('change', '.compile_type', (e: JQuery.ChangeEvent<HTMLSelectElement>) => {
			// FIXME: relative path
			const $parent = $(e.target).parent();

			if (e.target.value === 'java') {
				$parent.find('.java-only')
					.fadeIn(200)
					.removeClass(HIDDEN)
			}
			else {
				$parent.find('.java-only')
					.fadeOut(200)
					.addClass(HIDDEN)
			}

			updateValidator()
		})

		.on('change', '.upload-entry', (e: JQuery.ChangeEvent<HTMLInputElement>) => {
			const $inputText = $(e.target).parent().parent().prev();

			switch (e.target.files.length) {
				case 0:
					$inputText
						.val('')
						.tooltip('hide');
					break;
				case 1:
					$inputText
						.val(e.target.files[0].name)
						.tooltip('hide');
					break;
				default:
					const arr = [];
					const length = e.target.files.length;
					for (let i = 0; i < length; i++) arr.push(e.target.files[i].name);

					$inputText
						.val(`${length} files selected`)
						.tooltip({title: arr.sort().join('<br>'), html: true})
			}
		})
}