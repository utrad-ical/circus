@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_group_input').click(function(){
			//送信するフォームIDを取得
			$(this).closest('p').find('.frm_back').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Add new User Confirmation</h1>
			{{Form::open(['url' => asset('admin/user/complete'), 'method' => 'post')}}
				<table class="common_table al_l mar_b_10">
					<colgroup>
						<col width="20%">
						<col width="80%">
					</colgroup>
					<tr>
						<th>User ID</th>
						<td>{{$inputs['userID']}}</td>
					</tr>
					<tr>
						<th>Login ID</th>
						<td>{{$inputs['loginID']}}</td>
					</tr>
					<tr>
						<th>User Name</th>
						<td>{{$inputs['description']}}</td>
					</tr>
					<tr>
						<th>Group</th>
						<td>
							{{$inputs['groups']}}
						</td>
					</tr>
				</table>
				<p class="al_c">
					{{Form::button('Back to Edit', array('class' => 'common_btn link_frm_input'))}}
					{{Form::button('Save', array('class' => 'common_btn', 'type' => 'submit'))}}
				</p>
			{{Form::close()}}
			{{Form::open(['url' => asset('admin/user/input'), 'method' => 'POST', 'id' => 'frm_back'])}}
				{{Form::hidden('btnBack', 'btnBack')}}
			{{Form::close()}}
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@include('common.footer')