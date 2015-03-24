@extends('common.layout')

@section('page_css')
{{HTML::style('css/ui-lightness/jquery-ui-1.10.4.custom.min.css')}}
{{HTML::style('css/page.css')}}
@stop

@section('page_js')
{{HTML::script('js/jquery-ui.min.js')}}
<script>
	$(function() {
		//Case Details button is pressed during
		$('.link_case_detail').click(function(){
			$('.frmCaseDetail').submit();
			return false;
		});
	});
</script>
@stop

@section('title')
{{{$mode}}} Complete
@stop

@section('page_title')
{{{$mode}}} Complete
@stop

@section('content')
<p class="pad_tb_40 al_c">
	@if (isset($msg))
		{{{$msg}}}
	@elseif (isset($error_msg))
		<span class="txt_alert">{{{$error_msg}}}</span>
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
@stop