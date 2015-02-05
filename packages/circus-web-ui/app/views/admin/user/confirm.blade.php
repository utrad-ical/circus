@extends('common.layout')
@section('content')
<script type="text/javascript">
$(function() {
	$('.link_user_input').click(function(){
		//Get the form ID to be sent
		var post_data = '{"btnBack":"btnBack"}';
		post_data = JSON.parse(post_data);

		var target_elm = $('.frm_user_input');

		$.ajax({
			url: "./input",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});

	//Processing at the time of registration button is pressed
	$('.user_complete').click(function(){
		var post_data = $('.frm_user_complete').serializeArray();
		var target_elm = $('.frm_user_input');

		$.ajax({
			url: "./complete",
			type: 'POST',
			data: post_data,
			dataType: 'json',
			error: function(){
				alert('I failed to communicate.');
			},
			success: function(res){
				target_elm.empty();
				target_elm.append(res.response);
				target_elm.attr('style', 'display:inline;');
			}
		});
		return false;
	});
});
</script>
<div class="page_unique">
	<h1 class="page_ttl">{{$title}}</h1>
	{{Form::open(['url' => asset('admin/user/complete'), 'method' => 'post'])}}
		<table class="common_table al_l mar_b_10">
			<colgroup>
				<col width="20%">
				<col width="80%">
			</colgroup>
			<tr>
				<th>User ID</th>
				<td>{{$inputs['userID']}}</td>
			</tr>
			<tr>
				<th>Login ID</th>
				<td>{{$inputs['loginID']}}</td>
			</tr>
			<tr>
				<th>Description</th>
				<td>{{$inputs['description']}}</td>
			</tr>
			<tr>
				<th>Group</th>
				<td>
					{{$inputs['groupName']}}
				</td>
			</tr>
			<tr>
				<th>Login Enabled</th>
				<td>
					@if ($inputs['loginEnabled'] == true)
						true
					@else
						false
					@endif
				</td>
			</tr>
			<tr>
				<th>Theme</th>
				<td>{{$inputs['preferences_theme']}}</td>
			</tr>
			<tr>
				<th>Personal Information View</th>
				<td>
					@if ($inputs['preferences_personalInfoView'] == true)
						true
					@else
						false
					@endif
				</td>
			</tr>
		</table>
		<p class="submit_area">
			{{Form::button('Back to Edit', array('class' => 'common_btn link_user_input'))}}
			{{Form::button('Save', array('class' => 'common_btn user_complete'))}}
		</p>
	{{Form::close()}}
	{{Form::open(['url' => asset('admin/user/input'), 'method' => 'POST', 'class' => 'frm_back'])}}
		{{Form::hidden('btnBack', 'btnBack')}}
	{{Form::close()}}
</div>
@stop