<script>
	$(function() {
		$('.link_case_detail_search').click(function(){
			$(this).closest('li').find('.frm_case_detail_search').submit();
			return false;
		});
	});
</script>
<div id="gnavi_wrap">
	<h2 id="gnavi_wrap_switch">→</h2>
	<ul id="gnavi">
		<li>
			<a href="{{{asset('home')}}}"><span class="home"></span>Home</a>
		</li>
		<li>
			<a href="{{{asset('case/search')}}}"><span class="case"></span>Case</a>
			<ul>
				<li>{{HTML::link(asset('case/search'), 'Case Search')}}</li>
				@if (isset(Auth::user()->preferences['caseSearchPresets']))
					@foreach(Auth::user()->preferences['caseSearchPresets'] as $index => $val)
						<li>{{HTML::link(asset('case/search/' . $index), $val['save_label'])}}</li>
					@endforeach
				@endif
			</ul>
		</li>
		<li>
			<a href="{{{asset('series/search')}}}"><span class="series"></span>Series</a>
			<ul>
				<li>{{HTML::link(asset('series/search'), 'Series Search')}}</li>
				<li>{{HTML::link(asset('series/import'), 'Series Import')}}</li>
				@if (isset(Auth::user()->preferences['seriesSearchPresets']))
					@foreach(Auth::user()->preferences['seriesSearchPresets'] as $index => $val)
						<li>{{HTML::link(asset('series/search/' . $index), $val['save_label'])}}</li>
					@endforeach
				@endif
			</ul>
		</li>
		<li>
			<a href="{{{asset('share/search')}}}"><span class="share"></span>Share</a>
			<ul>
				<li>{{HTML::link(asset('share/search'), 'Share Search')}}</li>
				@if (isset(Auth::user()->preferences['shareSearchPresets']))
					@foreach(Auth::user()->preferences['shareSearchPresets'] as $index => $val)
						<li>{{HTML::link(asset('share/search/' . $index), $val['save_label'])}}</li>
					@endforeach
				@endif
			</ul>
		</li>
		<li>
			<a href="{{{asset('/admin')}}}"><span class="admin"></span>Admin</a>
			<ul>
				<li>{{HTML::link(asset('administration/group'), 'Group')}}</li>
				<li>{{HTML::link(asset('administration/user'), 'User')}}</li>
				<li>{{HTML::link(asset('administration/storage'), 'Storage')}}</li>
				<li>{{HTML::link(asset('administration/project'), 'Project')}}</li>
				<li>{{HTML::link(asset('administration/server_param'), 'Setting Server Params')}}</li>
			</ul>
		</li>
	</ul>
</div>