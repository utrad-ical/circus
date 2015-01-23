@extends('common.layout')
@section('content')
<script type="text/javascript" src="{{asset('/js/ajax/storage.js')}}"></script>
<div class="page_unique">
	<h1 class="page_ttl">{{$title}}</h1>
	{{Form::open(['url' => '', 'method' => 'post', 'class' => 'frm_storage_complete'])}}
		<table class="common_table mar_b_20">
			<colgroup>
				<col width="20%">
				<col width="80%">
			</colgroup>
			<tr>
				<th>Storage ID</th>
				<td>
					{{$inputs['storageID']}}
				</td>
			</tr>
			<tr>
				<th>path</th>
				<td>{{$inputs['path']}}</td>
			</tr>
			<tr>
				<th>type</th>
				<td>{{$inputs['type']}}</td>
			</tr>
			<tr>
				<th>active</th>
				<td>
					@if (isset($inputs['active']) && $inputs['active'] == 1)
						true
					@else
						false
					@endif
				</td>
			</tr>
		</table>
		<p class="submit_area">
			{{Form::button('Back to Edit', array('class' => 'common_btn link_storage_input'))}}
			{{Form::button('Save', array('class' => 'common_btn storage_complete'))}}
		</p>
	{{Form::close()}}
	{{Form::open(['url' => asset('admin/storage/input'), 'method' => 'POST', 'class' => 'frm_back'])}}
		{{Form::hidden('btnBack', 'btnBack')}}
	{{Form::close()}}
</div>
@stop