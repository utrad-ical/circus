@extends('common.layout')
@include('common.header')
@section('content')
<script tyep="text/javascript">
	$(function() {
		$('.link_group_edit').click(function(){
			//Get the form ID to be sent
			var post_data = $(this).closest('td').find('.frm_group_id').serializeArray();
			var target_elm = $('.frm_group_input');

			console.log(post_data);

			$.ajax({
				url: "./input",
				type: 'POST',
				data: post_data,
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					target_elm.empty();
					target_elm.append(res.response);
					target_elm.attr('style', 'display:inline;');
				}
			});
			return false;
		});
	});
</script>
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