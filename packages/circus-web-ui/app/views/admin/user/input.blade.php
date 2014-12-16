@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Add new User</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset('admin/user/search', 'Back to User List' array('class' => 'common_btn'))}}
			</div>
			{{Form::open(['url' => asset('admin/user/confirm'), 'method' => 'POST'])}}
				<table class="common_table mar_b_10">
					<colgroup>
						<col width="20%">
						<col width="80%">
					</colgroup>
					<tr>
						<th>User ID</th>
						<td>
							{{$inputs['userID']}}
							<span class="font_red">(IDはシステム側で自動生成)</span>
						</td>
					</tr>
					<tr>
						<th>Login ID</th>
						<td>
							{{Form::text('loginID', isset($inputs['loginID']) && $inputs['loginID'] ? $inputs['loginID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('loginID'))
								<br><span class="text_alert">{{$errors->first('loginID')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>User Name</th>
						<td>
							{{Form::text('description', isset($inputs['description']) && $inputs['description'] ? $inputs['loginID'] : '', array('class' => 'common_input_text w_300'))}}
							@if (isset($errors) && $errors->has('description'))
								<br><span class="text_alert">{{$errors->first('description')}}</span>
							@endif
						</td>
					</tr>
					<tr>
						<th>Group</th>
						<td>
							{{Form::select('groups', $group_list, isset($inputs['groups']) && $inputs['groups'] ? $inputs['groups'] : '', array('class' => 'multi_select w_300'))}}
							(multiple select available)
						</td>
					</tr>
				</table>
				<p class="al_c">
					{{Form::button('Confirmation', array('type' => 'submit', 'class' => 'common_btn'))}}
				</p>
			{{Form::close()}}
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')