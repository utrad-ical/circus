@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Login</h1>
		{{Form::open(['url' => 'login', 'method' => 'POST', 'id' => 'form_login'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>ID</th>
						<td>
							{{Form::text('loginID', isset($loginID) ? $loginID : '', array("class" => "common_input_text w_300"))}}
						</td>
					</tr>
					<tr>
						<th>パスワード</th>
						<td>
							{{Form::password('password', array("class" => "common_input_text w_300"))}}
							<br> <a href="./suport/forget_password/">forget Password??</a>
						</td>
					</tr>
				</table>
			</div>
			<p class="submit_area">
				{{Form::button("Login", array("class" => "common_btn mar_r_5", "onClick" => "document.getElementById('form_login').submit();"))}}
				<button type="button" value="Sign Up" class="common_btn">
					Sign Up
				</button>
				@if (isset($error_msg))
					<br><span class="al_c txt_alert">{{$error_msg}}</span>
				@endif
			</p>
		{{Form::close()}}
	</div>
</div>
@stop
@include('common.footer')