@extends('common.layout')

@section('title')
Login
@stop

@section('page_title')
Login
@stop

@section('content')
{{Form::open(['url' => 'login', 'method' => 'POST', 'id' => 'form_login', 'class' => 'pad_t_40'])}}
	<div class="w_500 m_auto al_c">
		<table class="common_table al_l">
			<colgroup>
				<col width="30%">
				<col width="70%">
			</colgroup>
			<tr>
				<th>ID</th>
				<td>
					{{Form::text('loginID', isset($loginID) ? $loginID : '', array('class' => 'common_input_text w_300', 'autofocus' => 'autofocus'))}}
				</td>
			</tr>
			<tr>
				<th>Password</th>
				<td>
					{{Form::password('password', array('class' => 'common_input_text w_300'))}}
				</td>
			</tr>
		</table>
	</div>
	<p class="submit_area">
		{{Form::submit('Login', array('class' => 'common_btn mar_r_5'))}}
		@if (isset($error_msg))
			<br><span class="al_c font_red">{{$error_msg}}</span>
		@endif
	</p>
{{Form::close()}}
@stop