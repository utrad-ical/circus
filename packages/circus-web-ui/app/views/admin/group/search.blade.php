@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript" src="{{asset('/js/ajax/group.js')}}"></script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Group</h1>
			<div class="al_l mar_b_10">
				{{HTML::link('', 'Add new Group', array('class' => 'common_btn frm_group_enable'))}}
			</div>
			<table class="result_table common_table">
				<colgroup>
					<col width="45%">
					<col width="45%">
					<col width="10%">
				</colgroup>
				<tr>
					<th>Group Name</th>
					<th></th>
				</tr>
				@if (count($group_list) > 0)
					@foreach ($group_list as $rec)
						<tr>
							<td>{{$rec->GroupName}}</td>
							<td class="al_c">
								{{HTML::link('/admin/group/input', 'Edit', array('class' => 'common_btn link_group_edit'))}}
								{{Form::open(['url' => asset('admin/group/input'), 'method' => 'POST', 'class' => 'frm_group_edit'])}}
									{{Form::hidden('GroupID', $rec->GroupID, array('class' => 'frm_group_id'))}}
								{{Form::close()}}
							</td>
						</tr>
					@endforeach
				@else
					<tr>
						<td colspan="2">Group has not been registered.</td>
					</tr>
				@endif
			</table>
			<br>
			<div class="frm_group_input" style="display:none;">
			</div>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')