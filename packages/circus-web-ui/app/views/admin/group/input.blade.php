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
						</td>
					</tr>
					<tr>
						<th>Group Name</th>
						<td>
							{{Form::text('GroupName', isset($inputs['GroupName']) ? $inputs['GroupName'] : '', array('placeholder' => 'Group名を入力してください', 'class' => 'common_input_text'))}}
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
								{{Form::checkbox('priviledges.createProject', 1, isset($inputs['priviledges.createProject']) && $inputs['priviledges.createProject'] == 1 ? true : false)}}
							</td>
						</tr>
						<tr>
							<th>Create Case</th>
							<td>
								{{Form::checkbox('priviledges.createCase', 1, isset($inputs['priviledges.createCase']) && $inputs['priviledges.createCase'] == 1 ? true : false)}}
							</td>
						</tr>
					</tbody>
				</table>
				<p class="submit_area">
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