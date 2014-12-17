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

//ログイン/ログアウト
Route::get('/', function(){return Redirect::to('login');});
Route::get('login', 'Logincontroller@getIndex');
Route::post('login', 'LoginController@login');
Route::get('logout', 'LoginController@logout');
Route::get('support/forget_password', 'SupportController@forgetPassword');

//トップページ
Route::post('home', 'TopController@getIndex');
Route::get('home', 'TopController@getIndex');

//ケース
Route::get('case/search', 'CaseController@search');
Route::post('case/search', 'CaseController@search');
Route::post('case/detail', 'CaseController@detail');
Route::post('case/edit', 'CaseController@input');
Route::post('case/input', 'CaseController@input');
Route::post('case/confirm', 'CaseController@confirm');
Route::post('case/complete', 'CaseController@regist');

//シリーズ
Route::get('series/search', 'SeriesController@getIndex');
Route::post('series/search', 'SeriesController@search');
Route::post('series/detail', 'SeriesController@detail');
Route::get('series/input', 'SeriesController@input');
Route::post('series/edit', 'SeriesController@input');
Route::post('series/confirm', 'SeriesController@confirm');
Route::post('series/complete', 'SeriesController@regist');

//管理画面
Route::get('admin', 'AdminController@getIndex');
//管理画面/グループ
Route::get('admin/group/', function(){return Redirect::to('admin/group/search');});
Route::get('admin/group/search', 'GroupController@search');
Route::post('admin/group/search', 'GroupController@search');
Route::get('admin/group/input', 'GroupController@input');
Route::post('admin/group/input', 'GroupController@input');
Route::post('admin/group/confirm', 'GroupController@confirm');
Route::post('admin/group/complete', 'GroupController@regist');
Route::get('admin/group/complete', 'GroupController@complete');
Route::post('admin/group/detail', 'GroupController@detail');
//管理画面/ユーザ
Route::get('admin/user/', function(){return Redirect::to('admin/user/search');});
Route::get('admin/user/search', 'UserController@search');
Route::post('admin/user/search', 'UserController@search');
Route::get('admin/user/input', 'UserController@input');
Route::post('admin/user/input', 'UserController@input');
Route::post('admin/user/confirm', 'UserController@confirm');
Route::post('admin/user/complete', 'UserController@regist');
Route::get('admin/user/complete', 'UserController@complete');
Route::post('admin/user/detail', 'UserController@detail');

//テストデータ登録
Route::get('test', 'TestController@getIndex');
Route::get('test/case', 'TestController@getIndexCase');
Route::post('test/case', 'TestController@registCase');
Route::get('test/series', 'TestController@getIndexSeries');
Route::post('test/series', 'TestController@registSeries');
Route::get('test/project', 'TestController@getIndexProject');
Route::post('test/project', 'TestController@registProject');
Route::get('test/user', 'TestController@getIndexUser');
Route::post('test/user', 'TestController@registUser');
Route::get('test/group', 'TestController@getIndexGroup');
Route::post('test/group', 'TestController@registGroup');