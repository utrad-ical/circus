@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">User Regist Test</h1>
		{{Form::open(['url' => asset('/test/user'), 'method' => 'POST', 'id' => 'form_user_regist'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>userID</th>
						<td>
							{{Form::text('userID', isset($inputs['userID']) ? $inputs['userID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('userID'))
								<br><span class="text_alert">{{$errors->first('userID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>loginID</th>
						<td>
							{{Form::text('loginID', isset($inputs['loginID']) ? $inputs['loginID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('loginID'))
								<br><span class="text_alert">{{$errors->first('loginID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>password</th>
						<td>
							{{Form::password('password', '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('password'))
								<br><span class="text_alert">{{$errors->first('password')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>groups</th>
						<td>
							{{Form::select('groups[]', $group_list, isset($inputs['groups']) ? $inputs['groups'] : null, array('class' => 'multi_select', 'multiple' => 'multiple'))}}
							@if (isset($errors) && $errors->has('groups'))
								<br><span class="text_alert">{{$errors->first('groups')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>description</th>
						<td>
							{{Form::text('description', isset($inputs['description']) ? $inputs['description'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('description'))
								<br><span class="text_alert">{{$errors->first('description')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>loginEnabled</th>
						<td>
							{{Form::checkbox('loginEnabled', true)}}
							@if (isset($errors) && $errors->has('loginEnabled'))
								<br><span class="text_alert">{{$errors->first('loginEnabled')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th colspan="2">preferences</th>
					</tr>
					<tr>
						<th>theme</th>
						<td>
							<label>
								{{Form::radio('preferences.theme', 'mode_white', isset($inputs['preferences.theme']) && $inputs['preferences.theme'] == 'mode_white' ? true : false)}}
								white
							</label>
							<label>
								{{Form::radio('preferences.theme', 'mode_black', isset($inputs['preferences.theme']) && $inputs['preferences.theme'] == 'mode_black' ? true : false)}}
								black
							</label>
							@if (isset($errors) && $errors->has('preferences.theme'))
								<br><span class="text_alert">{{$errors->first('preferences.theme')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>personalView</th>
						<td>
							{{Form::checkbox('preferences.personalView', true)}}
							@if (isset($errors) && $errors->has('preferences.personalView'))
								<br><span class="text_alert">{{$errors->first('preferences.personalView')}}</span>
							@endif
						</td>
					</tr>
				</table>
			</div>
			<p class="submit_area">
				{{Form::button("Regist", array("class" => "common_btn mar_r_5", "onClick" => "document.getElementById('form_user_regist').submit();"))}}
			</p>
		{{Form::close()}}
	</div>
</div>
@stop
@include('common.footer')