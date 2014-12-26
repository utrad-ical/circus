@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Error</h1>
			<p class="pad_tb_40 al_c">
				<span class="txt_alert">
					@if ($error_msg)
						{{$error_msg}}
					@else
						404 Not Found
					@endif
				</span>
			</p>
			<p class="al_c">
				{{HTML::link(asset('home'), 'Home', array('class' => 'common_btn'))}}
			</p>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')