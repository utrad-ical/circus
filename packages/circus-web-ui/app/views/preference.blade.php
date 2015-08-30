@extends('common.layout')

@section('head')
	{{HTML::style('css/jquery-ui.css')}}
	{{HTML::style('css/jquery.flexforms.css')}}
	<style>
		.ui-propertyeditor-row > td {
			padding-bottom: 1em;
		}
	</style>

	{{HTML::script('js/jquery-ui.min.js')}}
	{{HTML::script('js/jquery.flexforms.js')}}
	{{HTML::script('js/adminEditor.js')}}
	<script>
		$(function () {
			var editor = null;
			var resourceUrl = '/api/preference';

			$.get(resourceUrl).then(function (prefs) {
				editor = $('#editor');
				var properties = [
					{
						caption: 'Theme',
						key: 'theme',
						type: 'radio',
						spec: {options: ['mode_white:White', 'mode_black:Black']}
					},
					{caption: 'Show personal info', key: 'personalInfoView', type: 'checkbox'}
				];
				editor.propertyeditor({properties: properties}).propertyeditor('option', 'value', prefs);
				$('#save').on('click', saveClicked);
			});

			function saveClicked(data) {
				var data = editor.propertyeditor('option', 'value');
				api('preference', {
					data: data,
					success: function () {
						showMessage('Updated your preference.');
					}
				});
			}
		});
	</script>
@stop

@section('title')
	Preferences
@stop

@section('content')
	<div id="messages"></div>
	<div id="editor_container">
		<div id="editor"></div>
		<div class="al_c">
			<button id="save" class="common_btn">Save</button>
		</div>
	</div>
@stop