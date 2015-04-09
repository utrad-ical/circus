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

// APIs
Route::resource('api/user', 'UserApiController');
Route::resource('api/group', 'GroupApiController');
Route::resource('api/storage', 'StorageApiController');
Route::resource('api/project', 'ProjectApiController');
Route::put('api/storage/setactive/{storageID}', 'StorageApiController@setActive');
Route::resource('api/preference', 'UserPreferenceApiController');



//Case
Route::group(['before' => 'auth'], function() {
	Route::post('home', 'TopController@getIndex');
	Route::get('home', 'TopController@getIndex');

	Route::get('case/search', 'CaseSearchController@search');
	Route::post('case/search', 'CaseSearchController@search');
	Route::post('case/detail', 'CaseDetailController@detail');
	Route::post('case/edit', 'CaseRegisterController@input');
	Route::post('case/input', 'CaseRegisterController@input');
	Route::post('case/confirm', 'CaseRegisterController@confirm');
	Route::post('case/complete', 'CaseRegisterController@register');
	Route::get('case/complete', 'CaseRegisterController@complete');

//Case (for Ajax)
	Route::any('case/search_result', 'CaseSearchController@search_ajax');
	Route::any('case/save_search', 'CaseSearchController@save_search');
	Route::any('case/save_label', 'LabelRegisterController@save_label');
	Route::any('case/get_label_list', 'CaseDetailController@get_label_list');
	Route::any('case/export', 'CaseExportController@export');
	Route::any('case/get_revision_list', 'RevisionController@get_list');

	//Series
	Route::get('series/search', 'SeriesSearchController@search');
	Route::post('series/search', 'SeriesSearchController@search');
	Route::post('series/detail', 'SeriesDetailController@detail');
	Route::get('series/import', 'SeriesRegisterController@input');
	Route::post('series/complete', 'SeriesRegisterController@register');
	Route::get('series/complete', 'SeriesRegisterController@complete');

	//Series (for Ajax)
	Route::any('series/save_search', 'SeriesSearchController@save_search');
	Route::any('series/export', 'SeriesExportController@export');

	//Common download volume data
	Route::any('download/volume', function() {
		$inputs = Input::all();
		return CommonHelper::downloadZip(storage_path('cache').'/'.$inputs['dir_name'], $inputs['file_name']);
	});

	// Individual Administration pages
	Route::get('administration/{adminkind}', 'AdministrationController@index')
		 ->where('adminkind', '^(user|group|storage|project)$');

	// Management screen
	Route::get('admin', 'AdminController@getIndex');
	// Preference
	Route::get('preference', 'UserPreferenceController@index');
});

//test用
Route::get('case/save_label', function(){
	$js = array();
	$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
	$result['js'] = $js;
	$result['title'] = 'Label save test';
	$result['url'] = '/case/save_label';
	return View::make('/sample/sample', $result);
});



//404 pages
Event::listen('404', function()
{
    return App::abort(404);
});


