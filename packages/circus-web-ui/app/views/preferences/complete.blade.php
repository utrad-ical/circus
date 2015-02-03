@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Edit Preferences Complete</h1>
			<p class="pad_tb_40 al_c">
				@if (isset($msg))
					{{$msg}}
				@elseif (isset($error_msg))
					<span class="txt_alert">{{$error_msg}}</span>
				@endif
			</p>
			<p class="al_c">
				{{HTML::link(asset('home'), 'Home', array('class' => 'common_btn'))}}
			</p>
		</div>
	</div>
	@include('common.navi')
</div>
<div class="clear">&nbsp;</div>
@stop
@include('common.footer')