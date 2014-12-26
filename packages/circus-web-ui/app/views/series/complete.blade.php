@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function(){
		$('.link_series_search').click(function(){
			$('#frmSeriesSearch').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Series Import Complete</h1>
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
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')