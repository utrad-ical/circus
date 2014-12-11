@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Case Regist Test</h1>
		{{Form::open(['url' => asset('/test/case_regist', 'method' => 'POST', 'id' => 'form_case_regist'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>CaseID</th>
						<td>
							{{Form::text('caseID', isset($inputs["caseID"]) ? $inputs["caseID"] : '', array("class" => "common_input_text w_300"))}}
							@if (isset($error["caseID"])
								<br><span class="text_alert">{{$error["caseID"]}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>incrementalID</th>
						<td>
							{{Form::text('incrementalID', isset($inputs["incrementalID"]) ? $inputs["incrementalID"] : '', array("class" => "common_input_text w_300"))}}
							@if (isset($error["incrementalID"])
								<br><span class="text_alert">{{$error["incrementalID"]}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>projectID</th>
						<td>
							{{Form::select('projectID', $project_list, isset($inputs["projectID"]) ? $inputs["projectID"] : null, array("class" => "common_select"))}}
							@if (isset($error["projectID"])
								<br><span class="text_alert">{{$error["projectID"]}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>date</th>
						<td>
							{{Form::text('date', isset($inputs["date"]) ? $inputs["date"] : '', array("class" => "common_input_text w_200 datepicker"))}}
							@if (isset($error["date"])
								<br><span class="text_alert">{{$error["date"]}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th colspan="2">patientInfoCache</th>
					</tr>
					<tr>
						<th>patientID</th>
						<td>
							{{Form:;text('patientID', isset($inputs["patientID"]) ? $inputs["patientID"] : '', array("class" => "common_input_text w_200"))}}
							@if (isset($errors["patientID"])
								<br><span class="text_alert">{{$errors["patientID"]}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>name</th>
						<td>
							{{Form::text('name', isset($inputs['name']) ? $inputs['name'] : '', array('class' => 'common_input_text w_100'))}}
							@if (isset($error["name"])
								<br><span class="text_alert">{{$error["name"]}}</span>
							@endif
						</td>
						<th>age</th>
						<td>
							{{Form::text('age', isset($inputs['age']) ? $inputs['age'] : '', array('class' => 'common_input_txt w_100'))}}
							@if (isset($errors["age"])
								<br><span class="text_alert">{{$errors["age"]}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>birthday</th>
						<td>
							{{Form::text('birthday', isset($inputs["birthday"]) ? $inputs["birthday"] : '', array("class" => "common_input_text w_200 datepicker"))}}
							@if (isset($errors["birthday"])
								<br><span class="text_alert">{{$errors["birthday"]}}</span>
							@endif
						</td>
						<th>sex</th>
						<td>
							<label>
								{{Form::radio('sex', 'm', isset($inputs['sex']) && inputs['sex'] == 'm' ? true : false))}}
								male
							</label>
							<label>
								{{Form::radio('sex', 'f', isset($inputs['sex']) && inputs['sex'] == 'm' ? true : false))}}
								female
							</label>
							@if (isset($errors["sex"])
								<br><span class="text_alert">{{$errors["sex"]}}</span>
							@endif
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