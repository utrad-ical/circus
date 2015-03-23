@extends('common.layout')

@section('page_css')
{{HTML::style('css/page.css')}}
{{HTML::style('css/color.css')}}
@stop

@section('title')
Administrator
@stop

@section('page_title')
Administrator
@stop

@section('content')
{{HTML::link(asset('administration/group'), 'Group List', array('class' => 'common_btn'))}}
{{HTML::link(asset('administration/user'), 'User List', array('class' => 'common_btn'))}}
{{HTML::link(asset('administration/storage'), 'Storage List', array('class' => 'common_btn'))}}
@stop