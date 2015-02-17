<script type="text/javascript">
	$(function() {
		$('.link_case_detail_search').click(function(){
			$(this).closest('li').find('.frm_case_detail_search').submit();
			return false;
		});

		$('.link_series_detail_search').click(function(){
			$(this).closest('li').find('.frm_series_detail_search').submit();
			return false;
		});
	});
</script>
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
							<li>
								{{HTML::link(asset('/case/search'), $rec_val['save_label'], array('class' => 'link_case_detail_search'))}}
								{{Form::open(['url' => asset('/case/search'), 'method' => 'post', 'class' => 'frm_case_detail_search'])}}
									{{Form::hidden('condition_id', $rec_key)}}
								{{Form::close()}}
							</li>
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
					@if (Session::has('series_detail_search'))
						@foreach(Session::get('series_detail_search') as $rec_key => $rec_val)
							<li>
								{{HTML::link(asset('/series/search'), $rec_val['save_label'], array('class' => 'link_series_detail_search'))}}
								{{Form::open(['url' => asset('/series/search'), 'method' => 'post', 'class' => 'frm_series_detail_search'])}}
									{{Form::hidden('condition_id', $rec_key)}}
								{{Form::close()}}
							</li>
						@endforeach
					@endif
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
					<li>{{HTML::link(asset('/administration/group'), 'Group')}}</li>
					<li>{{HTML::link(asset('/administration/user'), 'User')}}</li>
					<li>{{HTML::link(asset('/administration/storage'), 'Storage')}}</li>
				</ul>
			</div>
		</li>
	</ul>
	<div class="clear">&nbsp;</div>
</div>