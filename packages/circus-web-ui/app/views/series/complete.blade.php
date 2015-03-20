@extends('common.layout')

@section('page_css')
@stop

@section('page_js')
<script type="text/javascript">
	$(function(){
		$('.link_series_search').click(function(){
			$('#frmSeriesSearch').submit();
			return false;
		});
	});
</script>
@stop

@section('title')
Series Import Complete
@stop

@section('page_title')
Series Import Complete
@stop

@section('content')
<p class="pad_tb_40 al_c">
	@if (isset($msg))
		{{$msg}}
	@elseif (isset($error_msg))
		<span class="txt_alert">{{$error_msg}}</span>
	@endif
</p>
<p class="al_c">
	{{HTML::link(asset('series/search'), 'View Series', array('class' => 'common_btn link_series_search'))}}
	{{Form::open(['url' => asset('series/search'), 'method' => 'POST', 'id' => 'frmSeriesSearch'])}}
		{{Form::hidden('btnBack', 'btnBack')}}
	{{Form::close()}}
</p>
@stop