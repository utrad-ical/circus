@extends('common.layout')

@section('title')
	General Server Configuration
@stop

@section('head')
	{{HTML::style('css/jquery-ui.css')}}
	{{HTML::style('css/jquery.flexforms.css')}}
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
			var domainRegex = /^[_a-zA-Z][_a-zA-Z0-9\-]*$/;
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
				$.ajax({
					url: '/api/server_param',
					success: function (data) {
						editor.propertyeditor('option', 'value', data);
					},
					dataType: 'json',
					cached: false
				});
			}

			$('#save').on('click', function() {
				$.ajax({
					url: '/api/server_param',
					method: 'POST',
					data: editor.propertyeditor('option', 'value'),
					dataType: 'json',
					success: function (data) {
						alert('Saved.');
						refresh();
					},
					error: function (res) {
						if ($.isPlainObject(res.responseJSON)) {
							editor.propertyeditor('complain', res.responseJSON.errors);
						} else {
							alert(res.responseText);
						}
					},
					cached: false
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
