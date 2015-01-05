<div id="gnavi_wrap">
	<h2 id="gnavi_wrap_switch">→</h2>
	<ul id="gnavi">
		<li class="gnavi_cell">
			<a href="{{{asset('/home')}}}">
				<span class="gnavi_btn_ico">{{Form::label('H')}}</span>
				<span class="gnavi_btn_main_txt">{{Form::label('Home')}}</span>
				<div class="clear">&nbsp;</div>
			</a>
		</li>
		<li class="gnavi_cell">
			<a href="{{{asset('/case/search')}}}">
				<span class="gnavi_btn_ico">{{Form::label('C')}}</span>
				<span class="gnavi_btn_main_txt">{{Form::label('Case')}}</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li>{{HTML::link(asset('/case/search'), 'Case Search')}}</li>
					@if (Session::has('case_detail_search'))
						@foreach(Session::get('case_detail_search') as $rec_key => $rec_val)
							<li>{{HTML::link(asset('/series/search'), 'User set condition'.$rec_key)}}</li>
						@endforeach
					@endif
				</ul>
			</div>
		</li>
		<li class="gnavi_cell">
			<a href="{{{asset('/series/search')}}}">
				<span class="gnavi_btn_ico">{{Form::label('S')}}</span>
				<span class="gnavi_btn_main_txt">{{Form::label('Series')}}</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li>{{HTML::link(asset('/series/search'), 'Series Search')}}</li>
					<li>{{HTML::link(asset('/series/import'), 'Series Import')}}</li>
					<li>{{HTML::link(asset('/series/search'), 'User set condition 01')}}</li>
					<li>{{HTML::link(asset('/series/search'), 'User set condition 02')}}</li>
					<li>{{HTML::link(asset('/series/search'), 'User set condition 03')}}</li>
				</ul>
			</div>
		</li>
		<li class="gnavi_cell">
			<a href="{{{asset('/admin')}}}">
				<span class="gnavi_btn_ico">{{Form::label('A')}}</span>
				<span class="gnavi_btn_main_txt">{{Form::label('Admin')}}</span>
				<div class="clear">&nbsp;</div>
			</a>
			<div class="gnavi_cell_inner">
				<ul class="gnavi_cell_inner_body">
					<li>{{HTML::link(asset('/admin/group'), 'Group')}}</li>
					<li>{{HTML::link(asset('/admin/user'), 'User')}}</li>
				</ul>
			</div>
		</li>
	</ul>
	<div class="clear">&nbsp;</div>
</div>