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
							@if (isset($errors) && $errors->has('studyUID'))
								<br><span class="text_alert">{{$errors->first('studyUID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>seriesUID</th>
						<td>
							{{Form::text('seriesUID', isset($inputs['seriesUID']) ? $inputs['seriesUID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('seriesUID'))
								<br><span class="text_alert">{{$errors->first('seriesUID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>storageID</th>
						<td>
							{{Form::text('storageID', isset($inputs['storageID']) ? $inputs['storageID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('storageID'))
								<br><span class="text_alert">{{$errors->first('storageID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>width</th>
						<td>
							{{Form::text('width', isset($inputs['width']) ? $inputs['width'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('width'))
								<br><span class="text_alert">{{$errors->first('width')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>height</th>
						<td>
							{{Form::text('height', isset($inputs['height']) ? $inputs['height'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('height'))
								<br><span class="text_alert">{{$errors->first('height')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>seriesDate</th>
						<td>
							{{Form::text('seriesDate', isset($inputs['seriesDate']) ? $inputs['seriesDate'] : '', array('class' => 'common_input_text w_300 datepicker'))}}
							@if (isset($errors) && $errors->has('seriesDate'))
								<br><span class="text_alert">{{$errors->first('seriesDate')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>modality</th>
						<td>
							{{Form::text('modality', isset($inputs['modality']) ? $inputs['modality'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('modality'))
								<br><span class="text_alert">{{$errors->first('modality')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>seriesDescription</th>
						<td>
							{{Form::text('seriesDescription', isset($inputs['seriesDescription']) ? $inputs['seriesDescription'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('seriesDescription'))
								<br><span class="text_alert">{{$errors->first('seriesDescription')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>bodyPart</th>
						<td>
							{{Form::text('bodyPart', isset($inputs['bodyPart']) ? $inputs['bodyPart'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('bodyPart'))
								<br><span class="text_alert">{{$errors->first('bodyPart')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>images</th>
						<td>
							{{Form::text('images', isset($inputs['images']) ? $inputs['images'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('images'))
								<br><span class="text_alert">{{$errors->first('images')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>stationName</th>
						<td>
							{{Form::text('stationName', isset($inputs['stationName']) ? $inputs['stationName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('stationName'))
								<br><span class="text_alert">{{$errors->first('stationName')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>modelName</th>
						<td>
							{{Form::text('modelName', isset($inputs['modelName']) ? $inputs['modelName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('modelName'))
								<br><span class="text_alert">{{$errors->first('modelName')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>manufacturer</th>
						<td>
							{{Form::text('manufacturer', isset($inputs['manufacturer']) ? $inputs['manufacturer'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('manufacturer'))
								<br><span class="text_alert">{{$errors->first('manufacturer')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>domain</th>
						<td>
							{{Form::text('domain', isset($inputs['domain']) ? $inputs['domain'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('domain'))
								<br><span class="text_alert">{{$errors->first('domain')}}</span>
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
							@if (isset($errors) && $errors->has('patientInfo.patientID'))
								<br><span class="text_alert">{{$errors->first('patientInfo.patientID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>patientName</th>
						<td>
							{{Form::text('patientInfo.patientName', isset($inputs['patientInfo.patientName']) ? $inputs['patientInfo.patientName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('patientInfo.patientName'))
								<br><span class="text_alert">{{$errors->first('patientInfo.patientName')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>age</th>
						<td>
							{{Form::text('patientInfo.age', isset($inputs['patientInfo.age']) ? $inputs['patientInfo.age'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('patientInfo.age'))
								<br><span class="text_alert">{{$errors->first('patientInfo.age')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>birthday</th>
						<td>
							{{Form::text('patientInfo.birthday', isset($inputs['patientInfo.birthday']) ? $inputs['patientInfo.birthday'] : '', array('class' => 'common_input_text w_300 datepicker'))}}
							@if (isset($errors) && $errors->has('patientInfo.birthday'))
								<br><span class="text_alert">{{$errors->first('patientInfo.birthday')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>sex</th>
						<td>
							<label>
								{{Form::radio('patientInfo.sex', 'm', isset($inputs['patientInfo.sex']) && $inputs['patientInfo.sex'] == 'm' ? true : false)}}
								male
							</label>
							<label>
								{{Form::radio('patientInfo.sex', 'f', isset($inputs['patientInfo.sex']) && $inputs['patientInfo.sex'] == 'f' ? true : false)}}
								female
							</label>
							@if (isset($errors) && $errors->has('patientInfo.sex'))
								<br><span class="text_alert">{{$errors->first('patientInfo.sex')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>height</th>
						<td>
							{{Form::text('patientInfo.height', isset($inputs['patientInfo.height']) ? $inputs['patientInfo.height'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('patientInfo.height'))
								<br><span class="text_alert">{{$errors->first('patientInfo.height')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>weight</th>
						<td>
							{{Form::text('patientInfo.weight', isset($inputs['patientInfo.weight']) ? $inputs['patientInfo.weight'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('patientInfo.weight'))
								<br><span class="text_alert">{{$errors->first('patientInfo.weight')}}</span>
							@endif
						</td>
					</tr>
				</table>
			</div>
			<p class="submit_area">
				{{Form::button('Regist', array('class' => 'common_btn mar_r_5', 'onClick' => 'document.getElementById("form_series_regist").submit();'))}}
			</p>
		{{Form::close()}}
	</div>
</div>
@stop
@include('common.footer')