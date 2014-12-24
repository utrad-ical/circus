@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_user_detail').click(function(){
			//Get the form ID to be sent
			$(this).closest('div').find('.frm_user_detail').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
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
				{{HTML::link(asset('admin/user/search'), 'Back to User list', array('class' => 'common_btn'))}}
				{{HTML::link(asset('admin/user/detail'), 'View added User', array('class' => 'common_btn link_user_detail'))}}
				{{HTML::link(asset('admin/user/input'), 'Add new User', array('class' => 'common_btn'))}}
				{{Form::open(['url' => asset('admin/user/detail'), 'method' => 'POST', 'class' => 'frm_user_detail'])}}
					{{Form::hidden('userID', $userID)}}
				{{Form::close()}}
			</p>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')