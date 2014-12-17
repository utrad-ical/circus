@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Add new Group</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset('admin/group/search'), 'Back to Group top', array('class' => 'common_btn'))}}
			</div>
			@if (isset($error_msg))
				<br><span class="text_alert">{{$error_msg}}</span>
			@else
				{{Form::open(['url' => asset('admin/group/confirm'), 'method' => 'POST'])}}
					<table class="common_table mar_b_20">
						<colgroup>
							<col width="20%">
							<col width="80%">
						</colgroup>
						<tr>
							<th>Group ID</th>
							<td>
								{{$inputs['GroupID']}}
								<span class="font_red">(IDはシステム側で自動生成)</span>
								@if (isset($errors) && $errors->has('GroupID'))
									<br><span class="text_alert">{{$errors->first('GroupID')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Group Name</th>
							<td>
								{{Form::text('GroupName', isset($inputs['GroupName']) ? $inputs['GroupName'] : '', array('placeholder' => 'Group名を入力してください', 'class' => 'common_input_text'))}}
								@if (isset($errors) && $errors->has('GroupName'))
									<br><span class="text_alert">{{$errors->first('GroupName')}}</span>
								@endif
							</td>
						</tr>
					</table>
					<h2 class="con_ttl">Admin Role</h2>
					<table class="common_table al_l">
						<colgroup>
							<col width="20%">
							<col width="80%">
						</colgroup>
						<tbody>
							<tr>
								<th>Create Project</th>
								<td>
									{{Form::checkbox('priviledges.createProject', 1, isset($inputs['priviledges_createProject']) && $inputs['priviledges_createProject'] == 1 ? true : false)}}
									@if (isset($errors) && $errors->has('priviledges.createProject'))
										<br><span class="text_alert">{{$errors->first('priviledges.createProject')}}</span>
									@endif
								</td>
							</tr>
							<tr>
								<th>Create Case</th>
								<td>
									{{Form::checkbox('priviledges.createCase', 1, isset($inputs['priviledges_createCase']) && $inputs['priviledges_createCase'] == 1 ? true : false)}}
									@if (isset($errors) && $errors->has('priviledges.createCase'))
										<br><span class="text_alert">{{$errors->first('priviledges.createCase')}}</span>
									@endif
								</td>
							</tr>
						</tbody>
					</table>
					<p class="submit_area">
						{{Form::button('Confirmation', array('type' => 'submit', 'class' => 'common_btn'))}}
					</p>
				{{Form::close()}}
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')