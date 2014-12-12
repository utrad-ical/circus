@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Project Regist Test</h1>
		{{Form::open(['url' => asset('/test/project_regist'), 'method' => 'POST', 'id' => 'form_project_regist'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>projectID</th>
						<td>
							{{Form::text('projectID', isset($inputs['projectID']) ? $inputs['projectID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['projectID']))
								<br><span class="text_alert">{{$errors['projectID']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>projectName</th>
						<td>
							{{Form::text('projectName', isset($inputs['projectName']) ? $inputs['projectName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors['projectName']))
								<br><span class="text_alert">{{$errors['projectName']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>createGroups</th>
						<td>
							{{Form::select('createGroups[]', $group_list, isset($inputs['createGroups']) ? $inputs['createGroups'] : null, array('class' => 'multi_select', 'multiple' => 'multiple'))}}
							@if (isset($errors['createGroups']))
								<br><span class="text_alert">{{$errors['createGroups']}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>viewGroups</th>
						<td>
							{{Form::select('viewGroups[]', $group_list, isset($inputs['viewGroups']) ? $inputs['viewGroups'] : null, array('class' => 'multi_select', 'multiple' => 'multiple'))}}
							@if (isset($errors['viewGroups']))
								<br><span class="text_alert">{{$errors['viewGroups']}}</span>
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