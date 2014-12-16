@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_group_detail').click(function(){
			//送信するフォームIDを取得
			$(this).closest('td').find('.frm_group_detail').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Group</h1>
			<div class="al_l mar_b_10">
				{{HTML::link('admin/group/input', 'Add new Group', array('class' => 'common_btn'))}}
			</div>
			<table class="result_table common_table">
				<colgroup>
					<col width="45%">
					<col width="45%">
					<col width="10%">
				</colgroup>
				<tr>
					<th>Group ID</th>
					<th>Group Name</th>
					<th></th>
				</tr>
				@if (count($group_list) > 0)
					@foreach ($group_list as $rec)
						<tr>
							<td>{{$rec->GroupID}}</td>
							<td>{{$rec->GroupName}}</td>
							<td class="al_c">
								{{HTML::link('/admin/group/detail', 'View', array('class' => 'common_btn link_group_detail'))}}
								{{Form::open(['url' => asset('admin/group/detail'), 'method' => 'POST', 'class' => 'frm_group_detail'])}}
									{{Form::hidden('GroupID', $rec->GroupID)}}
								{{Form::close()}}
							</td>
						</tr>
					@endforeach
				@else
					<tr>
						<td colspan="3">グループが登録されていません。</td>
					</tr>
				@endif
			</table>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')