@extends('common.layout')

@section('title')
Download Export Data
@stop

@section('content')
<div class="search_result pad_tb_5" id="result_case_list">
	<table class="result_table common_table">
		<colgroup>
			<col width="35%">
			<col width="50%">
			<col width="15%">
		</colgroup>
		<tr>
			<th>Task ID</th>
			<th>File</th>
			<th>Export Date</th>
		</tr>
		@if (count($list) > 0)
			@foreach ($list as $rec)
				<tr>
					<td>{{$rec->taskID}}</td>
					<td>{{HTML::link(asset('transfer/'.$rec->taskID), basename($rec->download))}}</td>
					<td>{{date('Y/m/d H:i:s', strtotime($rec->updateTime))}}</td>
				</tr>
			@endforeach
		@else
			<tr>
				<td colspan="3">
					No results.
				</td>
			</tr>
		@endif
	</table>
</div>
@stop