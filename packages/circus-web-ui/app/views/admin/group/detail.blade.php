@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_group_edit').click(function(){
			//Get the form ID to be sent
			$(this).closest('div').find('.frm_group_edit').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Group Detail</h1>
			@if (isset($error_msg))
				<span class="text_alert">{{$error_msg}}</span>
			@else
				<div class="al_l mar_b_10">
					{{HTML::link(asset('admin/group/search'), 'Group Top', array('class' => 'common_btn'))}}
					{{HTML::link(asset('admin/group/input'), 'Edit', array('class' => 'common_btn link_group_edit'))}}
					{{Form::open(['url' => asset('admin/group/input'), 'method' => 'POST', 'class' => 'frm_group_edit'])}}
						{{Form::hidden('GroupID', $group_detail->GroupID)}}
					{{Form::close()}}
				</div>
				<table class="common_table mar_b_20">
					<colgroup>
						<col width="20%">
						<col width="80%">
					</colgroup>
					<tr>
						<th>Group ID</th>
						<td>
							{{$group_detail->GroupID}}
							<span class="font_red">(IDはシステム側で自動生成)</span>
						</td>
					</tr>
					<tr>
						<th>Group Name</th>
						<td>{{$group_detail->GroupName}}</td>
					</tr>
				</table>
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')