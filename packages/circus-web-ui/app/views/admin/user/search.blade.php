@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_user_detail').click(function(){
			//送信するフォームIDを取得
			$(this).closest('td').find('.frm_user_detail').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">User</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset('admin/user/input'), 'Add new User', array('class' => 'common_btn'))}}
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
						<th>User ID</th>
						<th>User Name</th>
						<th>Group</th>
						<th></th>
					</tr>
					@if (count($user_list) > 0)
						@foreach ($user_list as $rec)
							<tr>
								<td>{{$rec['userID']}}</td>
								<td>{{$rec['description']}}</td>
								<td>{{$rec['groupName']}}</td>
								<td class="al_c">
									{{HTML::link(asset('admin/user/detail'), 'View', array('class' => 'common_btn link_user_detail'))}}
									{{Form::open(['url' => asset('admin/user/detail'), 'method' => 'POST', 'class' => 'frm_user_detail'])}}
										{{Form::hidden('userID', $rec['userID'])}}
									{{Form::close()}}
								</td>
							</tr>
						@endforeach
					@else
						<tr>
							<td colspan="4">ユーザが登録されていません。</td>
						</tr>
					@endif
				</table>
			</div>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')