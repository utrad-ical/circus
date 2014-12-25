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

//Login / logout
Route::get('/', function(){return Redirect::to('login');});
Route::get('login', 'Logincontroller@getIndex');
Route::post('login', 'LoginController@login');
Route::get('logout', 'LoginController@logout');
Route::get('support/forget_password', 'SupportController@forgetPassword');

//Front page
Route::post('home', 'TopController@getIndex');
Route::get('home', 'TopController@getIndex');

//Case
Route::get('case/search', 'CaseController@search');
Route::post('case/search', 'CaseController@search');
Route::post('case/detail', 'CaseController@detail');
Route::post('case/edit', 'CaseController@input');
Route::post('case/input', 'CaseController@input');
Route::post('case/confirm', 'CaseController@confirm');
Route::post('case/complete', 'CaseController@regist');
Route::get('case/complete', 'CaseController@complete');
//Case (for Ajax)
Route::any('case/revision', 'CaseController@revision_ajax');

//Series
Route::get('series/search', 'SeriesController@search');
Route::post('series/search', 'SeriesController@search');
Route::post('series/detail', 'SeriesController@detail');
Route::get('series/input', 'SeriesController@input');
Route::post('series/edit', 'SeriesController@input');
Route::post('series/confirm', 'SeriesController@confirm');
Route::post('series/complete', 'SeriesController@regist');

//Management screen
Route::get('admin', 'AdminController@getIndex');
//Management screen / group
Route::get('admin/group/', function(){return Redirect::to('admin/group/search');});
Route::get('admin/group/search', 'GroupController@search');
Route::post('admin/group/search', 'GroupController@search');
//Management screen / group (for Ajax)
Route::any('admin/group/input', 'GroupController@input');
Route::any('admin/group/confirm', 'GroupController@confirm');
Route::any('admin/group/complete', 'GroupController@regist');
Route::any('admin/group/detail', 'GroupController@detail');

//Management screen / user
Route::get('admin/user/', function(){return Redirect::to('admin/user/search');});
Route::get('admin/user/search', 'UserController@search');
Route::post('admin/user/search', 'UserController@search');
//Management screen / user (for Ajax)
Route::any('admin/user/input', 'UserController@input');
Route::any('admin/user/confirm', 'UserController@confirm');
Route::any('admin/user/complete', 'UserController@regist');
Route::any('admin/user/detail', 'UserController@detail');

//Test data register
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