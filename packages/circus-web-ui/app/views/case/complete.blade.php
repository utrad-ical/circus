@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		//Case Details button is pressed during
		$('.link_case_detail').click(function(){
			$('.frmCaseDetail').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">{{$title}}</h1>
			<p class="pad_tb_40 al_c">
				@if (isset($msg))
					{{$msg}}
				@elseif (isset($error_msg))
					<span class="txt_alert">{{$error_msg}}</span>
				@endif
			</p>
			<p class="al_c">
				{{HTML::link(asset('series/search'), 'View Series', array('class' => 'common_btn'))}}
				{{HTML::link(asset('case/search'), 'View Cases', array('class' => 'common_btn'))}}
				{{HTML::link(asset('case/detail'), 'View added Case', array('class' => 'common_btn link_case_detail'))}}

				{{Form::open(['url' => asset('case/detail'), 'method' => 'POST', 'class' => 'frmCaseDetail'])}}
					{{Form::hidden('caseID', $caseID)}}
					{{Form::hidden('mode', 'detail')}}
				{{Form::close()}}
			</p>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')