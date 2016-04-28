@extends('common.layout')

@section('title')
	General Server Configuration
@stop

@section('head')
	<style>
		.ui-propertyeditor-row > td {
			padding-bottom: 1em;
			width: 500px;
		}

		.ui-propertyeditor-heading > th {
			padding-top: 1em;
			border-bottom: 1px solid silver;
		}
	</style>

	{{HTML::script('js/jquery-ui.min.js')}}
	{{HTML::script('js/jquery.flexforms.js')}}

	<script>
		$(function () {
			var domainRegex = /^[_a-zA-Z][_a-zA-Z0-9\-.]*$/;
			var editor = $('#editor').propertyeditor({
				properties: [
					{
						key: 'domains',
						caption: 'Domains',
						type: 'list',
						spec: {
							elementType: 'text',
							elementSpec: {
								regex: domainRegex
							}
						}
					},
					{
						key: 'defaultDomain',
						caption: 'Default Domain',
						type: 'text',
						spec: {
							regex: domainRegex
						}
					}
				]
			});

			$('#cancel').on('click', refresh);
			refresh();

			function refresh() {
				api('server_param', {
					success: function (data) {
						editor.propertyeditor('option', 'value', data);
					}
				});
			}

			$('#save').on('click', function() {
				if (!editor.propertyeditor('valid')) {
					showMessage('Fill all the fields correctly before saving.', true);
					return;
				}
				api('server_param', {
					data: editor.propertyeditor('option', 'value'),
					success: function (data) {
						showMessage('Saved.');
						refresh();
					},
					error400: function (res) {
						if ($.isPlainObject(res.responseJSON)) {
							editor.propertyeditor('complain', res.responseJSON.errors);
						} else {
							showMessage(res.responseText, true);
						}
					}
				});
			});

		});
	</script>

@stop

@section('content')
	<div id="editor"></div>
	<div class="al_c">
		<button id="cancel" class="common_btn">Cancel</button>
		<button id="save" class="common_btn">Save</button>
	</div>
@stop
