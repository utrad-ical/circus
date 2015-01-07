@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript" src="{{asset('/js/ajax/user.js')}}"></script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">User</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset('admin/user/input'), 'Add new User', array('class' => 'common_btn frm_user_enable'))}}
			</div>
			<div class="search_result">
				<table class="result_table common_table">
					<colgroup>
						<col width="30%">
						<col width="30%">
						<col width="30%">
						<col width="10%">
					</colgroup>
					<tr>
						<th>Login ID</th>
						<th>Description</th>
						<th>Group</th>
						<th></th>
					</tr>
					@if (count($user_list) > 0)
						@foreach ($user_list as $rec)
							<tr>
								<td>{{$rec['loginID']}}</td>
								<td>{{$rec['description']}}</td>
								<td>{{$rec['groupName']}}</td>
								<td class="al_c">
									{{HTML::link(asset('admin/user/input'), 'Edit', array('class' => 'common_btn link_user_edit'))}}
									{{Form::open(['url' => asset('admin/user/input'), 'method' => 'POST', 'class' => 'frm_user_edit'])}}
										{{Form::hidden('userID', $rec['userID'], array('class' => 'frm_user_id'))}}
									{{Form::close()}}
								</td>
							</tr>
						@endforeach
					@else
						<tr>
							<td colspan="4">User is not registered.</td>
						</tr>
					@endif
				</table>
			</div>
			<div class="frm_user_input" style="display:none;">
			</div>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')