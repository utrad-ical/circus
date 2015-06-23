@extends('common.layout')

@section('title')
Error
@stop

@section('content')
<p class="pad_tb_40 al_c">
	<span class="font_red">
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
@stop