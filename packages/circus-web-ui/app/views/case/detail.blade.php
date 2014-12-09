@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_case_detail">
			<h1 class="page_ttl">Case Detail (Revision 0003)</h1>
				<div class="al_l mar_b_10 w_600 fl_l">
					{{HTML::link(asset('/case/search'), 'Back to Case Search Result')}}
					@if ($edit_flg)
						<a class="common_btn" href="input.html">
							Edit Case
						</a>
					@endif
					@if (isset($edit_flg))
						{{Form::open(["url" => asset('/case/edit'), "method" => "POST"])}}
							{{Form::hidden('caseID', $caseID)}}
							{{HTML::link(asset('/case/edit'), 'Edit Case', array("class" => "common_btn"))}}
						{{Form::close()}}
					@endif
				</div>
				<div class="al_r mar_b_10 w_300 fl_r">
					{{Form::select('revision', array(3 => 'Revision003', 2 => 'Revision002', 1 => 'Revision001'), 3, array("class" => "select w_180"))}}
					{{HTML::link(asset('/case/revision'), 'Revision List')}}
				</div>
				<div class="clear">&nbsp;</div>
				<table class="common_table al_l mar_b_10">
					<colgroup>
						<col width="20%">
						<col width="30%">
						<col width="20%">
						<col width="30%">
					</colgroup>
					<tr>
						<th>Case ID</th>
						<td colspan="3">12344-1234556-18374</td>
					</tr>
					<tr>
						<th>Project ID</th>
						<td>829374-29392-18291</td>
						<th>Project Name</th>
						<td>???病</td>
					</tr>
					<tr>
						<th>{{Form::label('Policy')}}</th>
						<td colspan="3">Policy A</td>
					</tr>
				</table>
				<div class="w_400 fl_l">
					{{From::select('seriesUID', array('seriesA' => 'Series A', 'seriesB' => 'Series B', 'seriesC' => 'Series C', 'seriesD' => 'Series D'))}}
					<label class="common_btn" for="img_mode_view">
						{{Form::radio('img_mode', 1, false, array('class' => 'img_mode', 'id' => 'img_mode_view'))}}
						View
					</label>
					<label class="common_btn" for="img_mode_draw">
						{{Form::radio('img_mode', 1, true, array('class' => 'img_mode', 'id' => 'img_mode_draw'))}}
						Draw
					</label>
					{{Form::button('Save', array('type' => 'submit', 'class' => 'common_btn'))}}
				</div>
				<div class="w_500 fl_r">
					<div class="info_area ">
						<p class="pad_10">
							Yamada Taro (12344-1234556-18374)
							<br>1980/01/01 male
						</p>
					</div>
				</div>
				<div class="clear">&nbsp;</div>
				<div class=" img_view_area pad_t_10">
					<div class="img_area fl_l" id="area_axial">
						<div class="btn_prev common_btn common_btn_green" data-target-elm="slider_axial">
							Prev
						</div>
						<div class="slider_outer">
							<div id="slider_axial" class="slider_elm"></div>
						</div>
						<div class="btn_next common_btn common_btn_green"data-target-elm="slider_axial">
							Next
						</div>
						<div class="clear">&nbsp;</div>
						<div id="img_area_axial" class="img_wrap">
							<img src="http://www.spiritek.co.jp/todaitestimg/img.php?id=4&amp;count=001" id="img_axial">
							<p class="al_c disp_num">
								<span id="current_num_txt_axial">1</span>
							</p>
							<div class="img_toolbar_wrap">
								<ul class="img_toolbar" data-target-element="img_axial">
									<li class="toolbar_btn">{{HTML::link('', '描')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '手')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '大')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '小')}}</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="img_area fl_r" id="area_sagital">
						<div class="btn_prev common_btn common_btn_blue" data-target-elm="slider_sagital">
							Prev
						</div>
						<div class="slider_outer">
							<div id="slider_sagital" class="slider_elm"></div>
						</div>
						<div class="btn_next common_btn common_btn_blue" data-target-elm="slider_sagital">
							Next
						</div>
						<div class="clear">&nbsp;</div>
						<div id="img_area_sagital" class="img_wrap">
							<img src="http://www.spiritek.co.jp/todaitestimg/img.php?id=6&amp;count=001" id="img_sagital">
							<p class="al_c disp_num">
								<span id="current_num_txt_sagital">1</span>
							</p>
							<div class="img_toolbar_wrap">
								<ul class="img_toolbar" data-target-element="img_sagital">
									<li class="toolbar_btn">{{HTML::link('', '描')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '手')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '大')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '小')}}</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="clear">&nbsp;</div>
					<div class="img_area fl_l" id="area_coronal">
						<div class="btn_prev common_btn common_btn_pink" data-target-elm="slider_coronal">
							Prev
						</div>
						<div class="slider_outer">
							<div id="slider_coronal" class="slider_elm"></div>
						</div>
						<div class="btn_next common_btn common_btn_pink" data-target-elm="slider_coronal">
							Next
						</div>
						<div class="clear">&nbsp;</div>
						<div id="img_area_coronal" class="img_wrap">
							<img src="http://www.spiritek.co.jp/todaitestimg/img.php?id=5&amp;count=001" id="img_coronal">
							<p class="al_c disp_num">
								<span id="current_num_txt_coronal">1</span>
							</p>
							<div class="img_toolbar_wrap">
								<ul class="img_toolbar" data-target-element="img_coronal">
									<li class="toolbar_btn">{{HTML::link('', '描')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '手')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '大')}}</li>
									<li class="toolbar_btn">{{HTML::link('', '小')}}</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="img_area fl_r" id="panel_wrap">
						<div id="layer_panel">
							<div class="pad_10">
								<h2 class="layer_panel_ttl">レイヤー情報</h2>
								<p class="layer_panel_switch">
									<span class="switch_main" id="opener">▼</span>
									<span class="switch_main" id="closer">▲</span>
								</p>
								<div class="clear">&nbsp;</div>
								<ul id="layer_list">
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 5, false, array('class' => 'layer_cell_input'))}}
											Layer 5
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 4, false, array('class' => 'layer_cell_input'))}}
											Layer 4
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 2, false, array('class' => 'layer_cell_input'))}}
											Layer 2
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 1, false, array('class' => 'layer_cell_input'))}}
											Layer 1
										</label>
									</li>
									<li class="layer_cell">
										<label class="layer_cell_label">
											{{Form::checkbox('layer', 3, true, array('class' => 'layer_cell_input'))}}
											Layer 3
										</label>
									</li>
								</ul>
							</div>
						</div>
					</div><!--/#panel_wrap-->
				</div>
				<div class="clear">&nbsp;</div>
				<div class="search_result">
					<h2 class="con_ttl">Revision</h2>
					<ul class="common_pager clearfix">
						<li class="pager_btn pager_previous">
							<a href="#">Prev</a>
						</li>
						<li class="pager_btn ">
							<a href="#">1</a>
						</li>
						<li class="pager_btn pager_omission">
							…
						</li>
						<li class="pager_btn current_page">
							10
						</li>
						<li class="pager_btn ">
							<a href="#">11</a>
						</li>
						<li class="pager_btn active">
							<a href="#">12</a>
						</li>
						<li class="pager_btn ">
							<a href="#">13</a>
						</li>
						<li class="pager_btn ">
							<a href="#">14</a>
						</li>
						<li class="pager_btn pager_omission">
							…
						</li>
						<li class="pager_btn ">
							<a href="#">81</a>
						</li>
						<li class="pager_btn pager_next">
							<a href="#">Next</a>
						</li>
						<li class="pager_sort_order">
							<select class="w_max">
								<option>Sort Order</option>
								<option>Last Update</option>
								<option>ID</option>
							</select>
						</li>
						<li class="pager_disp_num">
							<select class="w_max">
								<option>display num</option>
								<option>10</option>
								<option>50</option>
								<option>100</option>
								<option>all</option>
							</select>
						</li>
					</ul>
					<div class="pad_tb_10">
						<table class="result_table common_table al_c">
							<colgroup>
								<col width="14%">
								<col width="14%">
								<col width="14%">
								<col width="14%">
								<col width="28%">
								<col width="16%">
							</colgroup>
							<tr>
								<th>Revision No.</th>
								<th>Edit Datetime</th>
								<th>Series/Label</th>
								<th>Editor Name</th>
								<th>Editor Memo</th>
								<th></th>
							</tr>
							<tr>
								<td>12345</td>
								<td>2014/07/11(金)<br>10:11</td>
								<td>1 series<br>2 label</td>
								<td>野村行弘</td>
								<td class="al_l">三木先生、Revision12344に確認・加筆しました。</td>
								<td class="">
									<button type="button" value="" class="common_btn">
										View
									</button>
									<a href="revision_detail.html" class="common_btn mar_t_5">
										Edit
									</a>
								</td>
							</tr>
							<tr>
								<td>12344</td>
								<td>2014/07/10(木)<br>21:36</td>
								<td>1 series<br>1 label</td>
								<td>三木聡一郎</td>
								<td class="al_l">野村行弘先生、チェックお願いします。</td>
								<td class="">
									<button type="button" value="" class="common_btn">
										View
									</button>
									<a href="revision_detail.html" class="common_btn mar_t_5">
										Edit
									</a>
								</td>
							</tr>
						</table>
					</div><!-- #BeginLibraryItem "/Library/pager.lbi" -->
<ul class="common_pager clearfix">
	<li class="pager_btn pager_previous">
		<a href="#">Prev</a>
	</li>
	<li class="pager_btn ">
		<a href="#">1</a>
	</li>
	<li class="pager_btn pager_omission">
		…
	</li>
	<li class="pager_btn current_page">
		10
	</li>
	<li class="pager_btn ">
		<a href="#">11</a>
	</li>
	<li class="pager_btn active">
		<a href="#">12</a>
	</li>
	<li class="pager_btn ">
		<a href="#">13</a>
	</li>
	<li class="pager_btn ">
		<a href="#">14</a>
	</li>
	<li class="pager_btn pager_omission">
		…
	</li>
	<li class="pager_btn ">
		<a href="#">81</a>
	</li>
	<li class="pager_btn pager_next">
		<a href="#">Next</a>
	</li>
	<li class="pager_sort_order">
		<select class="w_max">
			<option>Sort Order</option>
			<option>Last Update</option>
			<option>ID</option>
		</select>
	</li>
	<li class="pager_disp_num">
		<select class="w_max">
			<option>display num</option>
			<option>10</option>
			<option>50</option>
			<option>100</option>
			<option>all</option>
		</select>
	</li>
</ul><!-- #EndLibraryItem --></div><!--/.search_result-->
			</div>
		</div><!--/.page_unique--><!-- #BeginLibraryItem "/Library/gnavi.lbi" -->


<div id="gnavi_wrap">
	<h2 id="gnavi_wrap_switch">→</h2>
	<ul id="gnavi">
		<li class="gnavi_cell">
			<a href="../home.html">
				<span class="gnavi_btn_ico">H</span>
				<span class="gnavi_btn_main_txt">Home</span>
				<div class="clear">&nbsp;</div>
			</a>
		</li>
		<li class="gnavi_cell">
			<a href="search.html">
				<span class="gnavi_btn_ico">C</span>
				<span class="gnavi_btn_main_txt">Case</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li><a href="search.html">Case Search</a></li>
					<li><a href="search_result.html">User set condition 01</a></li>
					<li><a href="search_result.html">User set condition 02</a></li>
					<li><a href="search_result.html">User set condition 03</a></li>
				</ul>
			</div>
		</li>
		<li class="gnavi_cell">
			<a href="../series/search.html">
				<span class="gnavi_btn_ico">S</span>
				<span class="gnavi_btn_main_txt">Series</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li><a href="../series/search.html">Series Search</a></li>
					<li><a href="../series/import.html">Series Import</a></li>
					<li><a href="../series/search_result.html">User set condition 01</a></li>
					<li><a href="../series/search_result.html">User set condition 02</a></li>
					<li><a href="../series/search_result.html">User set condition 03</a></li>
				</ul>
			</div>
		</li>
		<li class="gnavi_cell">
			<a href="../admin/index.html">
				<span class="gnavi_btn_ico">A</span>
				<span class="gnavi_btn_main_txt">Admin</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li><a href="../admin/policy/index.html">Policy</a></li>
					<li><a href="../admin/group/index.html">Group</a></li>
					<li><a href="../admin/user/index.html">User</a></li>
				</ul>
			</div>
		</li>
	</ul>
	<div class="clear">&nbsp;</div>
</div>
<!-- #EndLibraryItem --><div class="clear">&nbsp;</div>
	</div><!--/.page_contents_outer--><!-- #BeginLibraryItem "/Library/footer.lbi" -->

<div id="footer">
	<address>
		Copyright 2014 ???????? all rights reserved.
	</address>
</div><!--/#footer-->
<!-- #EndLibraryItem --></div>
</body>
</html>