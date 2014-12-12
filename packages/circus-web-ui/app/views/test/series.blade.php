@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Series Regist Test</h1>
		{{Form::open(['url' => asset('/test/series_regist'), 'method' => 'POST', 'id' => 'form_series_regist'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>studyUID</th>
						<td>
							{{Form::text('studyUID', isset($inputs['studyUID']) ? $inputs['studyUID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($error['studyUID']))
								<br><span class="text_alert">{{$error['studyUID']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>seriesUID</th>
						<td>
							{{Form::text('seriesUID', isset($inputs['seriesUID']) ? $inputs['seriesUID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($error['seriesUID']))
								<br><span class="text_alert">{{$error['seriesUID']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>storageID</th>
						<td>
							{{Form::text('storageID', isset($inputs['storageID']) ? $inputs['storageID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($error['storageID']))
								<br><span class="text_alert">{{$error['storageID']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>width</th>
						<td>
							{{Form::text('width', isset($inputs['width']) ? $inputs['width'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['width']))
								<br><span class="text_alert">{{$errors['width']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>height</th>
						<td>
							{{Form::text('height', isset($inputs['height']) ? $inputs['height'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['height']))
								<br><span class="text_alert">{{$errors['height']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>seriesDate</th>
						<td>
							{{Form::text('seriesDate', isset($inputs['seriesDate']) ? $inputs['seriesDate'] : '', array('class' => 'common_input_text w_300 datepicker'))}}
							@if (isset($errors['seriesDate']))
								<br><span class="text_alert">{{$errors['seriesDate']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>modality</th>
						<td>
							{{Form::text('modality', isset($inputs['modality']) ? $inputs['modality'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['modality']))
								<br><span class="text_alert">{{$errors['modality']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>seriesDescription</th>
						<td>
							{{Form::text('seriesDescription', isset($inputs['seriesDescription']) ? $inputs['seriesDescription'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['seriesDescription']))
								<br><span class="text_alert">{{$errors['seriesDescription']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>bodyPart</th>
						<td>
							{{Form::text('bodyPart', isset($inputs['bodyPart']) ? $inputs['bodyPart'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['bodyPart']))
								<br><span class="text_alert">{{$errors['bodyPart']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>images</th>
						<td>
							{{Form::text('images', isset($inputs['images']) ? $inputs['images'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['images']))
								<br><span class="text_alert">{{$errors['images']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>stationName</th>
						<td>
							{{Form::text('stationName', isset($inputs['stationName']) ? $inputs['stationName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['stationName']))
								<br><span class="text_alert">{{$errors['stationName']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>modelName</th>
						<td>
							{{Form::text('modelName', isset($inputs['modelName']) ? $inputs['modelName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['modelName']))
								<br><span class="text_alert">{{$errors['modelName']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>manufacturer</th>
						<td>
							{{Form::text('manufacturer', isset($inputs['manufacturer']) ? $inputs['manufacturer'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['manufacturer']))
								<br><span class="text_alert">{{$errors['manufacturer']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>domain</th>
						<td>
							{{Form::text('domain', isset($inputs['domain']) ? $inputs['domain'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['domain']))
								<br><span class="text_alert">{{$errors['domain']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th colspan="2">patientInfo</th>
					</tr>
					<tr>
						<th>patientID</th>
						<td>
							{{Form::text('patientInfo.patientID', isset($inputs['patientInfo.patientID']) ? $inputs['patientInfo.patientID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['patientInfo.patientID']))
								<br><span class="text_alert">{{$errors['patientInfo.patientID']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>patientName</th>
						<td>
							{{Form::text('patientInfo.patientName', isset($inputs['patientInfo.patientName']) ? $inputs['patientInfo.patientName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['patientInfo.patientName']))
								<br><span class="text_alert">{{$errors['patientInfo.patientName']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>age</th>
						<td>
							{{Form::text('patientInfo.age', isset($inputs['patientInfo.age']) ? $inputs['patientInfo.age'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['patientInfo.age']))
								<br><span class="text_alert">{{$errors['patientInfo.age']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>birthday</th>
						<td>
							{{Form::text('patientInfo.birthday', isset($inputs['patientInfo.birthday']) ? $inputs['patientInfo.birthday'] : '', array('class' => 'common_input_text w_300 datepicker'))}}
							@if (isset($errors['patientInfo.birthday']))
								<br><span class="text_alert">{{$errors['patientInfo.birthday']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>sex</th>
						<td>
							<label>
								{{Form::radio('patientInfo.sex', 'm', isset($inputs['patientInfo.sex']) && inputs['patientInfo.sex'] == 'm' ? true : false))}}
								male
							</label>
							<label>
								{{Form::radio('patientInfo.sex', 'f', isset($inputs['patientInfo.sex']) && inputs['patientInfo.sex'] == 'f' ? true : false))}}
								female
							</label>
							@if (isset($errors['patientInfo.sex']))
								<br><span class="text_alert">{{$errors['patientInfo.sex']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>height</th>
						<td>
							{{Form::text('patientInfo.height', isset($inputs['patientInfo.height']) ? $inputs['patientInfo.height'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($error['patientInfo.height']))
								<br><span class="text_alert">{{$error['patientInfo.height']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>weight</th>
						<td>
							{{Form::text('patientInfo.weight', isset($inputs['patientInfo.weight']) ? $inputs['patientInfo.weight'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($error['patientInfo.weight']))
								<br><span class="text_alert">{{$error['patientInfo.weight']}}</span>
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