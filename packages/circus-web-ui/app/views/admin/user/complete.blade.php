@extends('common.layout')
@section('content')
<script type="text/javascript">
	$(function() {
		//Details button is pressed during
		$('.link_user_edit').click(function(){
			//Get the form ID to be sent
			var post_data = $('.frm_group_edit').serializeArray();
			var target_elm = $('.frm_user_input');

			sendAjax(post_data, target_elm);
			return false;
		});

		//When new registration button is pressed
		$('.link_user_input').click(function(){
			var post_data = '{"mode":"regist"}';
			post_data = JSON.parse(post_data);
			var target_elm = $('.frm_user_input');

			sendAjax(post_data, target_elm);
			return false;
		});

		//Ajax post
		function sendAjax(post_data, target_elm) {
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
		}
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
		{{HTML::link(asset('admin/user/detail'), 'View added User', array('class' => 'common_btn link_user_edit'))}}
		{{HTML::link(asset('admin/user/input'), 'Add new User', array('class' => 'common_btn link_user_input'))}}
		{{Form::open(['url' => asset('admin/user/detail'), 'method' => 'POST', 'class' => 'frm_user_edit'])}}
			{{Form::hidden('userID', $userID, array('class' => 'frm_user_id'))}}
		{{Form::close()}}
	</p>
</div>
@stop