@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_revision_input">
			<h1 class="page_ttl">Series 12345</h1>

				<a class="common_btn fl_l mar_r_10 disp_b" href="../series/search_result.html">
					Back to Series list
				</a>
				<a class="common_btn fl_l disp_b" href="../case/input.html">
					Edit New Case
				</a>
				<div class="info_area w_500 fl_r mar_b_10">
					<p class="pad_10">
						Patient: Yamada Taro (12344-1234556-18374)1980/01/01 male
						<br>Last Update: <span class="bold">2014/07/11 10:11</span> by <span class="bold">Yukihiro Nomura</span>
					</p>
				</div>
				<div class="clear">&nbsp;</div>
				<div class=" img_view_area">
					<div class="img_area" id="area_axial">
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
						</div>
					</div>
					<div class="clear">&nbsp;</div>


				</div>
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
			<a href="../case/search.html">
				<span class="gnavi_btn_ico">C</span>
				<span class="gnavi_btn_main_txt">Case</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li><a href="../case/search.html">Case Search</a></li>
					<li><a href="../case/search_result.html">User set condition 01</a></li>
					<li><a href="../case/search_result.html">User set condition 02</a></li>
					<li><a href="../case/search_result.html">User set condition 03</a></li>
				</ul>
			</div>
		</li>
		<li class="gnavi_cell">
			<a href="search.html">
				<span class="gnavi_btn_ico">S</span>
				<span class="gnavi_btn_main_txt">Series</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li><a href="search.html">Series Search</a></li>
					<li><a href="import.html">Series Import</a></li>
					<li><a href="search_result.html">User set condition 01</a></li>
					<li><a href="search_result.html">User set condition 02</a></li>
					<li><a href="search_result.html">User set condition 03</a></li>
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
	</div>
<!--/.page_contents_outer--><!-- #BeginLibraryItem "/Library/footer.lbi" -->

<div id="footer">
	<address>
		Copyright 2014 ???????? all rights reserved.
	</address>
</div><!--/#footer-->
<!-- #EndLibraryItem --></div>






</body>
</html>