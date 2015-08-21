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

// Login / logout
Route::get('/', function() { return Redirect::to('login'); });
Route::get('login', 'LoginController@getIndex');
Route::post('login', 'LoginController@login');
Route::get('logout', 'LoginController@logout');


Route::group(['before' => 'auth'], function() {

	$staticView = function($uri, $view = null) {
		if (is_null($view)) $view = $uri;
		Route::any($uri, function() use($view) {
			return View::make($view);
		});
	};

	$staticView('home');

	Route::get('case/search/{preset_id}', 'CaseSearchController@search')
		 ->where('preset_id', '^\\d+$');
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
	Route::any('get_case_attribute', 'CaseSearchController@get_case_attribute');
	Route::any('case/save_tags', 'TagRegisterController@save_tags');

	Route::any('transfer/{taskID}', function($taskID){
		return CommonHelper::downloadTgz($taskID);
	});

	//Series
	Route::get('series/search/{preset_id}', 'SeriesSearchController@search')
		->where('preset_id', '^\\d+$');
	Route::get('series/search', 'SeriesSearchController@search');
	Route::post('series/search', 'SeriesSearchController@search');
	Route::post('series/detail', 'SeriesDetailController@detail');
	Route::get('series/import', 'SeriesImportController@import');
	Route::post('series/register', 'SeriesImportController@register');
	Route::get('series/complete', 'SeriesImportController@complete');

	//Series (for Ajax)
	Route::any('series/save_search', 'SeriesSearchController@save_search');
	Route::any('series/export', 'SeriesExportController@export');

	//Common download volume data
	Route::any('download/volume', function() {
		$inputs = Input::all();
		$download_url = storage_path('cache').'/'. $inputs['dir_name'];
		return CommonHelper::downloadZip($download_url, $inputs['file_name'], false);
	});

	//Share
	Route::get('share/search/{preset_id}', 'ShareSearchController@search')
		 ->where('preset_id', '^\\d+$');
	Route::get('share/search', 'ShareSearchController@search');
	Route::post('share/search', 'ShareSearchController@search');
	Route::any('share/search_result', 'ShareSearchController@search_ajax');
	Route::any('share/export', 'ShareExportController@export');
	Route::get('share/download', 'ShareDownloadController@index');

	// Administration
	Route::group(array('before' => 'admin'), function() use ($staticView) {

		$staticView('administration', 'admin.index');
		Route::get('administration/{adminkind}', 'AdministrationController@index')
			->where('adminkind', '^(user|group|storage|project|server_param)$');
		Route::resource('api/user', 'UserApiController');
		Route::resource('api/group', 'GroupApiController');
		Route::resource('api/storage', 'StorageApiController');
		Route::resource('api/project', 'ProjectApiController');
		Route::resource('api/serverParam', 'ServerParamApiController');
		Route::put('api/storage/setactive/{storageID}', 'StorageApiController@setActive');
		Route::post('api/server/start', 'ServerControllerController@start');
		Route::post('api/server/stop', 'ServerControllerController@stop');
		Route::post('api/server/status', 'ServerControllerController@status');

		$staticView('administration/server', 'admin.server');
	});

	// Task
	Route::get('task', 'TaskController@index');
	Route::get('task/{taskID}', 'TaskController@show');

	// Preference
	$staticView('preference');
	Route::resource('api/preference', 'UserPreferenceApiController');

	// Host static CIRCUS RS files in the vendor directory
	$rsHost = function($url, $file) {
		$ext = File::extension($file);
		$mime_list = ['js' => 'text/javascript', 'css' => 'text/css', 'png' => 'image/png', 'gif' => 'image/gif'];
		$mime = $mime_list[$ext];
		Route::any($url, function() use($file, $mime) {
			return Response::make(
				File::get(base_path('vendor/utrad-ical/circus-rs/build/browser') . '/' . $file),
				200,
				['Content-Type' => $mime]
			);
		});
	};
	$rsHost('js/imageViewer.js', 'imageViewer.js');
	$rsHost('js/voxelContainer.js', 'voxelContainer.js');
	$rsHost('css/imageViewer.css', 'imageViewer.css');
	$rsHost('css/tool-icon-sprite.png', 'tool-icon-sprite.png');
	$rsHost('css/loading-bar.gif', 'loading-bar.gif');
	$rsHost('css/panel-btn-sprite.png', 'panel-btn-sprite.png');

});

//404 pages
Event::listen('404', function()
{
    return App::abort(404);
});


