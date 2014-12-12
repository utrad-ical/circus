@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">User Regist Test</h1>
		{{Form::open(['url' => asset('/test/group'), 'method' => 'POST', 'id' => 'form_group_regist'])}}
			<div class="w_500 m_auto al_c">
				<table class="common_table al_l">
					<colgroup>
						<col width="30%">
						<col width="70%">
					</colgroup>
					<tr>
						<th>GroupID</th>
						<td>
							{{Form::text('GroupID', isset($inputs['GroupID']) ? $inputs['GroupID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('GroupID'))
								<br><span class="text_alert">{{$errors->first('GroupID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>GruopName</th>
						<td>
							{{Form::text('GruopName', isset($inputs['GruopName']) ? $inputs['GruopName'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('GruopName'))
								<br><span class="text_alert">{{$errors->first('GruopName')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>domains</th>
						<td>
							{{Form::text('domains', isset($inputs['domains']) ? $inputs['domains'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('domains'))
								<br><span class="text_alert">{{$errors->first('domains')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>priviledges</th>
						<td>
							{{Form::text('priviledges', isset($inputs['priviledges']) ? $inputs['priviledges'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('priviledges'))
								<br><span class="text_alert">{{$errors->first('priviledges')}}</span>
							@endif
						</td>
					</tr>
				</table>
			</div>
			<p class="submit_area">
				{{Form::button("Regist", array("class" => "common_btn mar_r_5", "onClick" => "document.getElementById('form_group_regist').submit();"))}}
			</p>
		{{Form::close()}}
	</div>
</div>
@stop
@include('common.footer')