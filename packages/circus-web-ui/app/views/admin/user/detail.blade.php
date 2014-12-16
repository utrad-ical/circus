@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_user_edit').click(function(){
			//送信するフォームIDを取得
			$(this).closest('div').find('.frm_user_edit').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Add new User</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset('admin/user/search', 'User Top' array('class' => 'common_btn'))}}
				{{HTML::link(asset('admin/user/input', 'Edit', array('class' => 'common_btn link_user_edit'))}}
				{{Form::open(['url' => asset('admin/user/input'), 'method' => 'POST', 'class' => 'frm_user_edit'])}}
					{{Form::hidden('userID', $userID)}}
				{{Form::close()}}
			</div>
			<table class="common_table al_l mar_b_10">
				<colgroup>
					<col width="25%">
					<col width="75%">
				</colgroup>
				<tr>
					<th>User ID</th>
					<td>{{$user_detail->userID}}</td>
				</tr>
				<tr>
					<th>Login ID</th>
					<td>{{$user_detail->loginID}}</td>
				</tr>
				<tr>
					<th>User Name</th>
					<td>{{$user_detail->description}}</td>
				</tr>
				<tr>
					<th>Group</th>
					<td>
						{{$user_detail->groups}}
					</td>
				</tr>
			</table>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@include('common.footer')