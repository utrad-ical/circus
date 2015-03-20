@extends('common.layout')

@section('title')
{{{$title}}}
@stop

@section('page_title')
Administrator
@stop

@section('content')
{{HTML::link(asset('administration/group'), 'Group List', array('class' => 'common_btn'))}}
{{HTML::link(asset('administration/user'), 'User List', array('class' => 'common_btn'))}}
{{HTML::link(asset('administration/storage'), 'Storage List', array('class' => 'common_btn'))}}
@stop