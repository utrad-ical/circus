@extends('common.layout')

@section('title')
Login
@stop

@section('head')
<style>
table.common_table input { display: block; width: 100%; }
</style>
@stop

@section('content')
{{Form::open(['url' => 'login', 'method' => 'POST', 'id' => 'form_login', 'class' => 'pad_t_40'])}}
	<div class="w_300 m_auto">
		<table class="common_table al_l">
			<tr>
				<td>
					{{Form::text('loginID', isset($loginID) ? $loginID : '',
						array('class' => 'common_input_text', 'placeholder' => 'ID or E-mail',
						'autofocus' => 'autofocus'))}}
				</td>
			</tr>
			<tr>
				<td>
					{{Form::password('password',
						array('class' => 'common_input_text', 'placeholder' => 'Password'))}}
				</td>
			</tr>
		</table>
	</div>
	<div class="submit_area">
		{{Form::submit('Login', array('class' => 'common_btn'))}}
		@if (isset($error_msg))
			<div class="al_c text_error">{{$error_msg}}</div>
		@endif
	</div>
{{Form::close()}}
@stop