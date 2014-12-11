@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function(){
		//新規登録
		$("#btnSignUp").click(function() {
			$(location).attr("href", "./user/regist");
		});
	});
</script>
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Login</h1>
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
							{{Form::text('loginID', isset($loginID) ? $loginID : '', array('class' => 'common_input_text w_300'))}}
						</td>
					</tr>
					<tr>
						<th>パスワード</th>
						<td>
							{{Form::password('password', array('class' => 'common_input_text w_300'))}}
							<br>
							{{HTML::link(asset('/support/forget_password'), 'forget Password??')}}
						</td>
					</tr>
				</table>
			</div>
			<p class="submit_area">
				{{Form::button('Login', array('class' => 'common_btn mar_r_5', 'onClick' => 'document.getElementById("form_login").submit();'))}}
				{{Form::button('Sign Up', array('class' => 'common_btn', 'id' => 'btnSignUp'))}}
				@if (isset($error_msg))
					<br><span class="al_c txt_alert">{{$error_msg}}</span>
				@endif
			</p>
		{{Form::close()}}
	</div>
</div>
@stop
@include('common.footer')