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
Route::get('login', 'LoginController@getIndex');
Route::post('login', 'LoginController@login');
Route::get('logout', 'LoginController@logout');
Route::get('support/forget_password', 'SupportController@forgetPassword');

//テーマ/個人情報表示変更
Route::get('preferences/input', 'UserController@inputPreferences');
Route::post('preferences/input', 'UserController@inputPreferences');
Route::post('preferences/confirm', 'UserController@confirmPreferences');
Route::post('preferences/complete', 'UserController@registerPreferences');
Route::get('preferences/complete', 'UserController@completePreferences');
//for Ajax
Route::any('preferences/theme', 'UserController@changeTheme');

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
Route::post('case/complete', 'CaseController@register');
Route::get('case/complete', 'CaseController@complete');
//Case (for Ajax)
Route::any('case/revision', 'CaseController@revision_ajax');
Route::any('case/search_result', 'CaseController@search_ajax');
Route::any('case/save_search', 'CaseController@save_search');
Route::any('case/save_label', 'CaseController@save_label');
Route::any('case/load_label', 'CaseController@load_label');
//test用
Route::get('case/save_label', function(){
	$js = array();
	$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
	$result['js'] = $js;
	$result['title'] = 'Label save test';
	$result['url'] = '/case/save_label';
	return View::make('/sample/sample', $result);
});
Route::get('case/load_label', function(){
	$js = array();
	$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
	$result['js'] = $js;
	$result['title'] = 'Label load test';
	$result['url'] = '/case/load_label';
	return View::make('/sample/load_sample', $result);
});


//Series
Route::get('series/search', 'SeriesController@search');
Route::post('series/search', 'SeriesController@search');
Route::post('series/detail', 'SeriesController@detail');
Route::get('series/import', 'SeriesController@input');
Route::post('series/complete', 'SeriesController@register');
Route::get('series/complete', 'SeriesController@complete');
//Series (for Ajax)
Route::any('series/save_search', 'SeriesController@save_search');
Route::get('series/get_series', 'SeriesController@get_series');

//Management screen
Route::get('admin', 'AdminController@getIndex');
//Management screen / group
Route::get('admin/group/', function(){return Redirect::to('admin/group/search');});
Route::get('admin/group/search', 'GroupController@search');
Route::post('admin/group/search', 'GroupController@search');
//Management screen / group (for Ajax)
Route::any('admin/group/input', 'GroupController@input');
Route::any('admin/group/confirm', 'GroupController@confirm');
Route::any('admin/group/complete', 'GroupController@register');
//Management screen / user
Route::get('admin/user/', function(){return Redirect::to('admin/user/search');});
Route::get('admin/user/search', 'UserController@search');
Route::post('admin/user/search', 'UserController@search');
//Management screen / user (for Ajax)
Route::any('admin/user/input', 'UserController@input');
Route::any('admin/user/confirm', 'UserController@confirm');
Route::any('admin/user/complete', 'UserController@register');

//Management screen / storage
Route::get('admin/storage/', function(){return Redirect::to('admin/storage/search');});
Route::get('admin/storage/search', 'StorageController@search');
Route::post('admin/storage/search', 'StorageController@search');
//Management screen / storage (for Ajax)
Route::any('admin/storage/input', 'StorageController@input');
Route::any('admin/storage/confirm', 'StorageController@confirm');
Route::any('admin/storage/complete', 'StorageController@register');

//404 pages
Event::listen('404', function()
{
    return App::abort(404);
});


