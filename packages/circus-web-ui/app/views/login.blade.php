@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Login</h1>
		{{Form::open(['url' => 'login', 'method' => 'POST'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>{{Form::label('loginID', 'ID')}}</th>
						<td>
							{{Form::text('loginID', isset($loginID) ? $loginID : '', array("class" => "common_input_text w_300"))}}
						</td>
					</tr>
					<tr>
						<th>
							{{Form::label('password', 'パスワード')}}
						</th>
						<td>
							{{Form::password('password', array("class" => "common_input_text w_30"))}}
							<br> <a href="./2_input_email.html">forget Password??</a>
						</td>
					</tr>
				</table>
			</div>
			<p class="submit_area">
				{{Form::submit('Login', array('class' => 'common_btn mar_r_5'))}}
				<button type="button" value="Sign Up" class="common_btn">
					Sign Up
				</button>
			</p>
			<br>
			<span class="text_arlert"><?php $error_msg; ?></span>
		{{Form::close()}}
	</div>
</div>
</div>
@stop
@include('common.footer')