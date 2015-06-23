@extends('common.layout')

@section('head')
    <style>
        #main_menu {
            margin: 30px;
        }

        #main_menu li {
            display: inline-block;
        }

        #main_menu li a {
            color: white;
            width: 150px;
            height: 30px;
            line-height: 30px;
        }
    </style>
@stop

@section('title')
Home
@stop

@section('content')
    <div>Welcome to CIRCUS DB</div>
    <nav id="main_menu">
        <ul>
            <li>{{HTML::link(asset('series/search'), 'Series Search', ['class' => 'common_btn'])}}</li>
            <li>{{HTML::link(asset('series/import'), 'Series Import', ['class' => 'common_btn'])}}</li>
            <li>{{HTML::link(asset('case/search'), 'Case Search', ['class' => 'common_btn'])}}</li>
        </ul>
    </nav>
@stop
