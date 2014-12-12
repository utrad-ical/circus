@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents page_area">
	<div class="page_unique">
		<h1 class="page_ttl">Dummy Data Regist Test</h1>
		<div class="w_500 m_auto al_c">
			{{HTML::link(asset('/test/case'), 'Case Dummy Data Regist')}}<br>
			{{HTML::link(asset('/test/series'), 'Series Dummy Data Regist')}}<br>
			{{HTML::link(asset('/test/project'), 'Project Dummy Data Regist')}}<br>
			{{HTML::link(asset('/test/user'), 'User Dummy Data Regist')}}
		</div>
		@if (isset($msg))
			<br><span>{{$msg}}</span>
		@endif
	</div>
</div>
@stop
@include('common.footer')