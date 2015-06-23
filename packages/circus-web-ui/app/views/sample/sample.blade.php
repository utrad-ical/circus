@extends('common.layout')

@section('head')
{{HTML::script('/js/jquery-ui.min.js')}}
{{HTML::script('/js/jquery.flexforms.js')}}
<script>
	$(function(){
		var attribute_properties = [
			{type: 'text', key: 'name', caption: 'Your Name'},
			{type: 'text', key: 'zip', caption: 'Zip Code', spec: { regex: /^\d{3}\-\d{4}$/, placeholder: '???-????' }},
			{type: 'number', key: 'age', caption: 'Age', spec: { default: 40, min: 10, max: 100 } },
			{type: 'select', spec: {options: ['Male', 'Female']}, key: 'sex', caption: 'Sex'},
			{type: 'select', spec: {options: ['1', '2', '3'], valueType: 'number'}, key: 'floor', caption: 'Floor'},
			{type: 'date', key: 'birthday', caption: 'Birthday'},
			{type: 'checkbox', key: 'enabled', caption: 'Enabled'},
			{type: 'radio', key: 'agree', caption: 'Agreement', spec: {
				options: ['yes:I agree', 'no:I disagree']
			}}
		];
		var attribute_prop = $('#the_panel_attribute');
		attribute_prop.propertyeditor({properties: attribute_properties});

		var format = 'YYYY-MM-DD-hh-mm-ss-SSS';
		//var unix_time1 = $.now();
		var dt1 = new Date();
		var labelID1 = dt1.getFullYear()+"-"+("0"+(dt1.getMonth()+1)).slice(-2)+"-"+("0"+dt1.getDate()).slice(-2)+"-"+("0"+dt1.getHours()).slice(-2)+"-"+("0"+dt1.getMinutes()).slice(-2)+"-"+("0"+dt1.getSeconds()).slice(-2)+"-"+("00"+dt1.getMilliseconds()).slice(-3);
		console.log(labelID1);
		$('.upload_file').click(function(){
			var revision_attributes = attribute_prop.propertyeditor('option', 'value')
			var dt2 = new Date();
			var labelID2 = dt2.getFullYear()+"-"+("0"+(dt2.getMonth()+1)).slice(-2)+"-"+("0"+dt2.getDate()).slice(-2)+"-"+("0"+dt2.getHours()).slice(-2)+"-"+("0"+dt2.getMinutes()).slice(-2)+"-"+("0"+dt2.getSeconds()).slice(-2)+"-"+("00"+dt2.getMilliseconds()).slice(-3);
			var data = {
				"caseId"	:	"8683ab3077ac750329f5b85997203c09aa2e3733caff535865b40700e7a8b663",
				"memo"		:	$('#memo').val(),
				"attribute"	:	JSON.stringify(revision_attributes),
				"series" :	[
					{
						"id"	:	"1.3.6.1.4.1.14519.5.2.1.6279.6001.619372068417051974713149104919",
						"label"	:	[
							{
								"attributes"	:	{},
							//	"id"			:	$('#labelID1').val(),
								"id"			:	labelID1,
								"name"			:	$('#labelName1').val(),
								"offset"		:	[$('#offsetX1').val(), $('#offsetY1').val(), $('#offsetZ1').val()],
								"size"			:	[$('#voxelW1').val(), $('#voxelH1').val(), $('#drawNum1').val()],
								"image"			:	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAIAQMAAAARA0f2AAAABlBMVEUAAAD///+l2Z/dAAAAD0lEQVQI12OAg/8NUAQGAC/3BH7xHLr3AAAAAElFTkSuQmCC'
							},
							{
								"attributes"	:	{},
							//	"id"			:	$('#labelID2').val(),
								"id"			:	labelID2,
								"name"			:	$('#labelName2').val(),
								"offset"		:	[$('#offsetX2').val(), $('#offsetY2').val(), $('#offsetZ2').val()],
								"size"			:	[$('#voxelW2').val(), $('#voxelH2').val(), $('#drawNum2').val()],
								"image"			:	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAIAQMAAAARA0f2AAAABlBMVEUAAAD///+l2Z/dAAAAD0lEQVQI12OAg/8NUAQGAC/3BH7xHLr3AAAAAElFTkSuQmCC'
							}
						]
					}
				]
			};

			console.log(data);

			$.ajax({
				url: "{{asset('case/save_label')}}",
				type: 'POST',
				data: {"data":data},
				dataType: 'json',
				error: function(){
					alert('I failed to communicate.');
				},
				success: function(res){
					alert(res.message);
				}
			});
			return false;
		});
	});
</script>
@stop

@section('title')
Save Label Sample
@stop

@section('page_title')
Save Label Sample
@stop

@section('content')
<div class="al_l mar_b_10">
	{{Form::open(['url' => asset('case/save_label'), 'method' => 'POST', 'files' => true, 'id' => 'frmSample'])}}
		<table class="common_table mar_b_10">
			<tr>
				<th>ラベル名</th>
				<td colspan="3">{{Form::text('labelName1', 'Sample Label', array('id' => 'labelName1'))}}</td>
			</tr>
			<tr>
				<th>始点</th>
				<td>X:{{Form::text('offsetX1', 1, array('id' => 'offsetX1'))}}</td>
				<td>Y:{{Form::text('offsetY1', 2, array('id' => 'offsetY1'))}}</td>
				<td>Z:{{Form::text('offsetZ1', 3, array('id' => 'offsetZ1'))}}</td>
			</tr>
			<tr>
				<th>Voxel</th>
				<td>Width:{{Form::text('voxelW1', 1, array('id' => 'voxelW1'))}}</td>
				<td>Height:{{Form::text('voxelH1', 1, array('id' => 'voxelH1'))}}</td>
				<td>枚数:{{Form::text('labelNumber1', 1, array('id' => 'drawNum1'))}}</td>
			</tr>
			<tr>
				<th>メモ</th>
				<td colspan="3">{{Form::text('memo','メモ', array('id' => 'memo'))}}</td>
			</tr>
		</table>
		<table class="common_table mar_b_10">
			<tr>
				<th>ラベル名</th>
				<td colspan="3">{{Form::text('labelName2', 'Sample Label', array('id' => 'labelName2'))}}</td>
			</tr>
			<tr>
				<th>始点</th>
				<td>X:{{Form::text('offsetX2', 1, array('id' => 'offsetX2'))}}</td>
				<td>Y:{{Form::text('offsetY2', 2, array('id' => 'offsetY2'))}}</td>
				<td>Z:{{Form::text('offsetZ2', 3, array('id' => 'offsetZ2'))}}</td>
			</tr>
			<tr>
				<th>Voxel</th>
				<td>Width:{{Form::text('voxelW2', 2, array('id' => 'voxelW2'))}}</td>
				<td>Height:{{Form::text('voxelH2', 2, array('id' => 'voxelH2'))}}</td>
				<td>枚数:{{Form::text('labelNumber2', 2, array('id' => 'drawNum2'))}}</td>
			</tr>
		</table>
		<div id="the_panel_attribute"></div>
		<p class="al_c">
			{{Form::button('Save', array('class' => 'common_btn upload_file mar_t_20'))}}
		</p>
	{{Form::close()}}

</div>
@stop