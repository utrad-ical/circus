@extends('common.layout')

@section('page_css')
@stop

@section('page_js')
@stop

@section('title')
{{{$title}}}
@stop

@section('page_title')
{{{$title}}}
@stop

@section('content')
	<style>
		.badge {
			border: 1px solid silver;
			display: inline-block;
			margin-left: 5px;
			padding: 0 2px;
		}

		.operation_cell {
			text-align: center;
		}

		.ui-propertyeditor-row > td {
			padding-bottom: 1em;
		}
	</style>

	<table id="list" class="common_table result_table">
		<thead></thead>
		<tbody></tbody>
	</table>
	<div class="al_r mar_t_10">
		<button id="new" class="common_btn">Create new</button>
	</div>
	<div id="messages"></div>
	<div id="editor_container" style="display: none">
		<h1 id="status" class="page_ttl"></h1>
		<div id="editor"></div>
		<div class="al_c">
			<button id="cancel" class="common_btn">Cancel</button>
			<button id="save" class="common_btn">Save</button>
		</div>
	</div>
	@yield('admin-content')
@stop