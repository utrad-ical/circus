@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_admin_home">
			<h1 class="page_ttl">Administrator</h1>
			{{HTML::link(asset('administration/group'), 'Group List', array('class' => 'common_btn'))}}
			{{HTML::link(asset('administration/user'), 'User List', array('class' => 'common_btn'))}}
			{{HTML::link(asset('administration/storage'), 'Storage List', array('class' => 'common_btn'))}}
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')