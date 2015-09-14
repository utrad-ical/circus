@extends('common.layout')

@section('title')
Download Export Data
@stop

@section('content')
<div class="search_result pad_tb_5" id="result_case_list">
	<table class="result_table common_table">
		<colgroup>
			<col>
			<col>
			<col>
		</colgroup>
		<tr>
			<th>Task ID</th>
			<th>File</th>
			<th>Export Date</th>
		</tr>
		@forelse ($list as $rec)
			<tr>
				<td>{{$rec->taskID}}</td>
				<td>{{HTML::link(asset('download/'.$rec->taskID), 'Download')}}</td>
				<td>{{date('Y/m/d H:i:s', strtotime($rec->updateTime))}}</td>
			</tr>
		@empty
			<tr>
				<td colspan="3">
					No results.
				</td>
			</tr>
		@endforelse
	</table>
</div>
@stop