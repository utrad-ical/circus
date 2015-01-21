@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript" src="{{asset('js/jquery.base64.min.js')}}"></script>
{{HTML::script('/js/jquery-ui.min.js')}}
{{HTML::script('/js/jquery.flexforms.js')}}
<script type="text/javascript">
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

		$('.upload_file').click(function(){

			var tmp_src = "http://todai/img/common/header_logo.png";
			var tmp_src2 = "http://todai/img/common/footer_logo.png";

						var revision_attributes = attribute_prop.propertyeditor('option', 'value')

			var data = {
				"caseId"	:	"e3b8af3f79e3af403d0cbbab0fb632bc276970c2768ca6b8716e75958c136faa",
				"memo"		:	$('#memo').val(),
				"attribute"	:	JSON.stringify(revision_attributes),
				"series" :	[
					{
						"id"	:	"LIDC-IDRI-0002",
						"label"	:	[
							{
								"attributes"	:	{},
								"id"			:	$('#labelID1').val(),
								"name"			:	$('#labelName1').val(),
								"offset"		:	[$('#offsetX1').val(), $('#offsetY1').val(), $('#offsetZ1').val()],
								"size"			:	[$('#boxcelW1').val(), $('#boxelH1').val(), $('#drawNum1').val()],
								"image"			:	$.base64.encode(tmp_src)
							},
							{
								"attributes"	:	{},
								"id"			:	$('#labelID2').val(),
								"name"			:	$('#labelName2').val(),
								"offset"		:	[$('#offsetX2').val(), $('#offsetY2').val(), $('#offsetZ2').val()],
								"size"			:	[$('#boxcelW1').val(), $('#boxelH1').val(), $('#drawNum1').val()],
								"image"			:	$.base64.encode(tmp_src2)
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
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Label Save Sample</h1>
			<div class="al_l mar_b_10">
				{{Form::open(['url' => asset('case/save_label'), 'method' => 'POST', 'files' => true, 'id' => 'frmSample'])}}
					<table class="common_table mar_b_10">
						<tr>
							<th>ラベルID</th>
							<td colspan="3">{{Form::text('labelID1', 'Label01', array('id' => 'labelID1'))}}</td>
						</tr>
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
							<th>ラベルID</th>
							<td colspan="3">{{Form::text('labelID2', 'Label01', array('id' => 'labelID2'))}}</td>
						</tr>
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
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')