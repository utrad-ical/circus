@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_group_detail').click(function(){
		//	console.log('called');
			//送信するフォームIDを取得
			$(this).closest('div').find('.frm_group_detail').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Add new Group Complete</h1>
			<p class="pad_tb_40 al_c">
				@if (isset($msg))
					{{$msg}}
				@elseif (isset($error_msg))
					<span class="text_alert">{{$error_msg}}</span>
				@endif
			</p>
			<p class="al_c">
				{{HTML::link(asset('admin/group/search'), 'Back to Group list', array('class' => 'common_btn'))}}
				{{HTML::link(asset('admin/group/detail'), 'View added Group', array('class' => 'common_btn link_group_detail'))}}
				{{HTML::link(asset('admin/group/input'), 'Add new Group', array('class' => 'common_btn'))}}
				{{Form::open(['url' => asset('admin/group/detail'), 'method' => 'POST', 'class' => 'frm_group_detail'])}}
					{{Form::hidden('GroupID', $GroupID)}}
				{{Form::close()}}
			</p>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')