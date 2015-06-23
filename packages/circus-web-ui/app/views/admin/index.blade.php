@extends('common.layout')

@section('page_css')
<style>
#admin_menu li {
	margin-bottom: 8px;
}
#admin_menu .common_btn {
	width: 20em;
}
</style>
@stop

@section('title')
Administration
@stop

@section('page_title')
Administration
@stop

@section('content')
<ul id="admin_menu">
	<li>{{HTML::link(asset('administration/server_param'), 'Server Configuration', array('class' => 'common_btn'))}}</li>
	<li>{{HTML::link(asset('administration/group'), 'Groups', array('class' => 'common_btn'))}}</li>
	<li>{{HTML::link(asset('administration/user'), 'Users', array('class' => 'common_btn'))}}</li>
	<li>{{HTML::link(asset('administration/storage'), 'Storage', array('class' => 'common_btn'))}}</li>
	<li>{{HTML::link(asset('administration/project'), 'Projects', array('class' => 'common_btn'))}}</li>
</ul>
@stop
