@extends('common.layout')
@section('content')
<script type="text/javascript">
	$(function() {
		//Confirmation button is pressed during processing
		//Cancel button is pressed at the time of processing
		$('.storage_cancel').click(function(){
			if (window.confirm('Do you input content but you sure will be destroyed?')){
				var target_elm = $('.frm_storage_input');
				target_elm.empty();
			}
			return false;
		});
	});
</script>
{{HTML::script('/js/ajax/storage.js')}}
<div class="page_unique">
	<h1 class="page_ttl">{{$title}}</h1>
	@if (isset($error_msg))
		<br><span class="txt_alert">{{$error_msg}}</span>
	@else
		{{Form::open(['url' => '', 'method' => 'POST', 'class' => 'frm_storage_confirm'])}}
			<table class="common_table mar_b_20">
				<colgroup>
					<col width="20%">
					<col width="80%">
				</colgroup>
				<tr>
					<th>Storage ID</th>
					<td>
						{{$inputs['storageID']}}
						@if (isset($errors) && $errors->has('storageID'))
							<br><span class="txt_alert">{{$errors->first('storageID')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>path</th>
					<td>
						{{Form::text('path', isset($inputs['path']) ? $inputs['path'] : '', array('class' => 'common_input_text'))}}
						@if (isset($errors) && $errors->has('path'))
							<br><span class="txt_alert">{{$errors->first('path')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>type</th>
					<td>
						<label>
							{{Form::radio('type', 'dicom', isset($inputs['type']) && $inputs['type'] == 'dicom' ? true : false)}}
							dicom
						</label>
						<label>
							{{Form::radio('type', 'label', isset($inputs['type']) && $inputs['type'] == 'label' ? true : false)}}
							label
						</label>
						@if (isset($errors) && $errors->has('type'))
							<br><span class="txt_alert">{{$errors->first('type')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>active</th>
					<td>
						{{Form::checkbox('active', true, isset($inputs['active']) && $inputs['active'] == true ? true : false)}}
						@if (isset($errors) && $errors->has('active'))
							<br><span class="txt_alert">{{$errors->first('active')}}</span>
						@endif
					</td>
				</tr>
			</table>
			<p class="submit_area">
				{{Form::button('Cancel', array('class' => 'common_btn storage_cancel'))}}
				{{Form::button('Confirmation', array('class' => 'common_btn storage_confirm'))}}
			</p>
		{{Form::close()}}
	@endif
</div>
@stop