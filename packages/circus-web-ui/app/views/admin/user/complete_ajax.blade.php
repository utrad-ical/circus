@extends('common.layout')
@section('content')
<script type="text/javascript">
	$(function() {
		//Details button is pressed during
		$('.link_user_detail').click(function(){
			//Get the form ID to be sent
			var post_data = $(this).closest('div').find('.frm_user_id').serializeArray();
			var target_elm = $('.frm_user_input');

			$.ajax({
				url: "{{asset('/admin/user/detail')}}",
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

		//When new registration button is pressed
		$('.link_user_input').click(function(){
			var target_elm = $('.frm_user_input');

			$.ajax({
				url: "{{asset('/admin/user/input')}}",
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
<div class="page_unique">
	<h1 class="page_ttl">Add new User Complete</h1>
	<p class="pad_tb_40 al_c">
		@if (isset($msg))
			{{$msg}}
		@elseif (isset($error_msg))
			<span class="text_alert">{{$error_msg}}</span>
		@endif
	</p>
	<p class="al_c">
		{{HTML::link(asset('admin/user/detail'), 'View added User', array('class' => 'common_btn link_user_detail'))}}
		{{HTML::link(asset('admin/user/input'), 'Add new User', array('class' => 'common_btn'))}}
		{{Form::open(['url' => asset('admin/user/detail'), 'method' => 'POST', 'class' => 'frm_user_detail'])}}
			{{Form::hidden('userID', $userID, array('class' => 'frm_user_id'))}}
		{{Form::close()}}
	</p>
</div>
@stop