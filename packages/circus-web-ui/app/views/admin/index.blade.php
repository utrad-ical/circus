@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_admin_home">
			<h1 class="page_ttl">Administrator</h1>
			<ul id="page_admin_home_menu_list">
				<li class="page_admin_home_menu_cell">
					<div class="cell_inner">
						<h2 class="cell_ttl">Group</h2>
						{{HTML::link(asset('admin/group/search'), 'Group List', array('class' => 'common_btn'))}}
						{{HTML::link(asset('admin/group/input'), 'Add new Group', array('class' => 'common_btn'))}}
					</div>
				</li>

				<li class="page_admin_home_menu_cell">
					<div class="cell_inner">
						<h2 class="cell_ttl">User</h2>
						{{HTML::link(asset('admin/user/search'), 'User List', array('class' => 'common_btn'))}}
						{{HTML::link(asset('admin/user/input'), 'Add new User', array('class' => 'common_btn'))}}
					</div>
				</li>
			</ul>
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')