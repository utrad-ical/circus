@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Case Regist Test</h1>
		{{Form::open(['url' => asset('/test/case'), 'method' => 'POST', 'id' => 'form_case_regist'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>CaseID</th>
						<td>
							{{Form::text('caseID', isset($inputs['caseID']) ? $inputs['caseID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('caseID'))
								<br><span class="text_alert">{{$errors->first('caseID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>incrementalID</th>
						<td>
							{{Form::text('incrementalID', isset($inputs['incrementalID']) ? $inputs['incrementalID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('incrementalID'))
								<br><span class="text_alert">{{$errors->first('incrementalID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>projectID</th>
						<td>
							{{Form::select('projectID', $project_list, isset($inputs['projectID']) ? $inputs['projectID'] : null, array('class' => 'common_select'))}}
							@if (isset($errors) && $errors->has('projectID'))
								<br><span class="text_alert">{{$errors->first('projectID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>date</th>
						<td>
							{{Form::text('date', isset($inputs['date']) ? $inputs['date'] : '', array('class' => 'common_input_text w_200 datepicker'))}}
							@if (isset($errors) && $errors->has('date'))
								<br><span class="text_alert">{{$errors->first('date')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th colspan="2">patientInfoCache</th>
					</tr>
					<tr>
						<th>patientID</th>
						<td>
							{{Form::text('patientInfoCache.patientID', isset($inputs['patientInfoCache.patientID']) ? $inputs['patientInfoCache.patientID'] : '', array('class' => 'common_input_text w_200'))}}
							@if (isset($errors) && $errors->has('patientInfoCache.patientID'))
								<br><span class="text_alert">{{$errors->first('patientInfoCache.patientID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>name</th>
						<td>
							{{Form::text('patientInfoCache.name', isset($inputs['patientInfoCache.name']) ? $inputs['patientInfoCache.name'] : '', array('class' => 'common_input_text w_100'))}}
							@if (isset($errors) && $errors->has('patientInfoCache.name'))
								<br><span class="text_alert">{{$errors->first('patientInfoCache.name')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>age</th>
						<td>
							{{Form::text('patientInfoCache.age', isset($inputs['patientInfoCache.age']) ? $inputs['patientInfoCache.age'] : '', array('class' => 'common_input_txt w_100'))}}
							@if (isset($errors) && $errors->has('patientInfoCache.age'))
								<br><span class="text_alert">{{$errors->first('patientInfoCache.age')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>birthday</th>
						<td>
							{{Form::text('patientInfoCache.birthday', isset($inputs['patientInfoCache.birthday']) ? $inputs['patientInfoCache.birthday'] : '', array('class' => 'common_input_text w_200 datepicker'))}}
							@if (isset($errors) && $errors->has('patientInfoCache.birthday'))
								<br><span class="text_alert">{{$errors->first('patientInfoCache.birthday')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>sex</th>
						<td>
							<label>
								{{Form::radio('patientInfoCache.sex', 'm', isset($inputs['patientInfoCache.sex']) && $inputs['patientInfoCache.sex'] == 'm' ? true : false)}}
								male
							</label>
							<label>
								{{Form::radio('patientInfoCache.sex', 'f', isset($inputs['patientInfoCache.sex']) && $inputs['patientInfoCache.sex'] == 'f' ? true : false)}}
								female
							</label>
							@if (isset($errors) && $errors->has('patientInfoCache.sex'))
								<br><span class="text_alert">{{$errors->first('patientInfoCache.sex')}}</span>
							@endif
						</td>
					</tr>
				</table>
			</div>
			<p class="submit_area">
				{{Form::button('Regist', array('class' => 'common_btn mar_r_5', 'onClick' => 'document.getElementById("form_case_regist").submit();'))}}
			</p>
		{{Form::close()}}
	</div>
</div>
@stop
@include('common.footer')