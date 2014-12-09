<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/

//ログイン画面
Route::get('/', function(){return Redirect::to('login');});

Route::get('login', 'Logincontroller@getIndex');
Route::post('login', 'LoginController@login');

//トップページ
Route::post('home', 'TopController@getIndex');
Route::get('home', 'TopController@getIndex');

//ケース検索
Route::get('case/search', 'CaseController@getIndex');
Route::post('case/search', 'CaseController@search');
Route::post('case/detail', 'CaseController@detail');
Route::post('case/revision', 'CaseController@revision');
Route::post('case/edit', 'CaseController@edit');
Route::get('case/input', 'CaseController@input');

//シリーズ検索
Route::get('series/search', 'SeriesController@getIndex');
Route::post('series/search', 'SeriesController@search');
Route::post('series/detail', 'SeriesController@detail');