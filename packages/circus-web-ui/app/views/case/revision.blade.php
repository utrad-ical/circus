@extends('common.new_layout')
@section('content')
<colgroup>
	<col width="14%">
	<col width="14%">
	<col width="14%">
	<col width="14%">
	<col width="28%">
	<col width="16%">
</colgroup>
<tr>
	<th>Revision No.</th>
	<th>Edit Datetime</th>
	<th>Series/Label</th>
	<th>Editor Name</th>
	<th>Editor Memo</th>
	<th></th>
</tr>
@if (count($revision_list))
	@foreach ($revision_list as $rec)
		<tr>
			<td>{{$rec['revisionNo']}}</td>
			<td>
				{{$rec['editDate']}}<br>
				{{$rec['editTime']}}
			</td>
			<td>
				{{$rec['seriesCount']}} series<br>
				{{$rec['labelCount']}} label
			</td>
			<td>{{$rec['creator']}}</td>
			<td class="al_l">{{$rec['memo']}}</td>
			<td class="">
				{{Form::open(['url' => asset('/case/detail'), 'method' => 'post', 'class' => 'form_case_detail'])}}
					{{Form::hidden('mode', $mode)}}
					{{Form::hidden('caseID', $case_detail['caseID'])}}
					{{Form::hidden('revisionNo', $rec['revisionNo'])}}
					{{Form::button('View', array('class' => 'common_btn link_case_detail'))}}
					{{HTML::link(asset('/case/detail'), 'Edit', array('class' => 'common_btn mar_t_5 link_case_detail'))}}
				{{Form::close()}}
			</td>
		</tr>
	@endforeach
@else
	<tr>
		<td colspan="6">Revision is not registered.</td>
	</tr>
@endif
@stop