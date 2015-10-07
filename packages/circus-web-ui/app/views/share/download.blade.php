@extends('common.layout')

@section('title')
Download
@stop

@section('content')
<table class="result_table common_table">
	<tr>
		<th>Task ID</th>
		<th>Public</th>
		<th>Download</th>
		<th>Export Date</th>
	</tr>
	@forelse ($list as $rec)
		<tr>
			<td>{{$rec->taskID}}</td>
			<td>{{$rec->publicDownload ? 'Yes' : '-'}}</td>
			<td>{{HTML::link(asset('download/'.$rec->taskID), 'Download', ['class' => 'common_btn'])}}</td>
			<td>{{date('Y/m/d H:i:s', strtotime($rec->updateTime))}}</td>
		</tr>
	@empty
		<tr>
			<td colspan="4">
				No results.
			</td>
		</tr>
	@endforelse
</table>
@stop