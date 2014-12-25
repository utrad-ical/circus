@extends('common.layout')
@section('content')
<script type="text/javascript">
	$(function() {
		//Process at the time of details button is pressed
		$('.link_group_detail').click(function(){
			var post_data = $('.frm_group_detail').serializeArray();
			var target_elm = $('.frm_group_input');

			$.ajax({
				url: "{{asset('/admin/group/detail')}}",
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
		$('.group_input').click(function(){
			var post_data = '{"mode":"regist"}';
			post_data = JSON.parse(post_data);
			var target_elm = $('.frm_group_input');

			$.ajax({
				url: "{{asset('/admin/group/input')}}",
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
	<h1 class="page_ttl">{{$title}}</h1>
	<p class="pad_tb_40 al_c">
		@if (isset($msg))
			{{$msg}}
		@elseif (isset($error_msg))
			<span class="text_alert">{{$error_msg}}</span>
		@endif
	</p>
	<p class="al_c">
		{{HTML::link(asset('admin/group/detail'), 'View added Group', array('class' => 'common_btn link_group_detail'))}}
		{{HTML::link(asset('admin/group/input'), 'Add new Group', array('class' => 'common_btn group_input'))}}
		{{Form::open(['url' => asset('admin/group/detail'), 'method' => 'POST', 'class' => 'frm_group_detail'])}}
			{{Form::hidden('GroupID', $GroupID)}}
		{{Form::close()}}
	</p>
</div>
@stop