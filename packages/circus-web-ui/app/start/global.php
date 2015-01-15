<?php

/*
|--------------------------------------------------------------------------
| Register The Laravel Class Loader
|--------------------------------------------------------------------------
|
| In addition to using Composer, you may use the Laravel class loader to
| load your controllers and models. This is useful for keeping all of
| your classes in the "global" namespace without Composer updating.
|
*/

ClassLoader::addDirectories(array(

	app_path().'/commands',
	app_path().'/controllers',
	app_path().'/models',
	app_path().'/database/seeds',
	app_path().'/lib',
	app_path().'/util'

));

/*
|--------------------------------------------------------------------------
| Application Error Logger
|--------------------------------------------------------------------------
|
| Here we will configure the error logger setup for the application which
| is built on top of the wonderful Monolog library. By default we will
| build a basic log file setup which creates a single file for logs.
|
*/

Log::useDailyFiles(storage_path() . '/logs/debug.log');

/*
|--------------------------------------------------------------------------
| Application Error Handler
|--------------------------------------------------------------------------
|
| Here you may handle any errors that occur in your application, including
| logging them or displaying custom views for specific errors. You may
| even register several error handlers to handle different types of
| exceptions. If nothing is returned, the default error view is
| shown, which includes a detailed stack trace during debug.
|
*/

App::error(function(Exception $exception, $code)
{
	Log::error($exception);
	$result = array();
	$result['title'] = 'error';
	$result['url'] = 'home';
	$result['error_msg'] = $exception->getMessage() ? $exception->getMessage() : '';
	return Response::view('error', $result, $code);
});

/*
|--------------------------------------------------------------------------
| Maintenance Mode Handler
|--------------------------------------------------------------------------
|
| The "down" Artisan command gives you the ability to put an application
| into maintenance mode. Here, you will define what is displayed back
| to the user if maintenance mode is in effect for the application.
|
*/

App::down(function()
{
	return Response::make("Be right back!", 503);
});

/*
|--------------------------------------------------------------------------
| Require The Filters File
|--------------------------------------------------------------------------
|
| Next we will load the filters file for the application. This gives us
| a nice separate location to store our route and application filter
| definitions instead of putting them all in the main routes file.
|
*/
$myLogger = new Illuminate\Log\Writer( new Monolog\Logger( 'SQL log' ) );
$myLogger->useDailyFiles( app_path().'/storage/logs/sql.log' );
Event::listen('illuminate.query', function($query, $bindings, $time, $name) use($myLogger)
{
    $data = compact('bindings', 'time', 'name');
    foreach ($bindings as $i => $binding)
    {
        if($binding instanceof \DateTime)
        {
            $bindings[$i] = $binding->format('\'Y-m-d H:i:s\'');
        }elseif(is_string($binding)){
            $bindings[$i] = "'$binding'";
        }
    }
    $query = str_replace(array('%', '?'), array('%%', '%s'), $query);
    $query = vsprintf($query, $bindings);
    $myLogger->info($query, $data);
});

Auth::extend("eloquent", function() {
    return new Illuminate\Auth\Guard(
     	new \Illuminate\Auth\EloquentUserProvider(new CustomHasher(), "User"),
        App::make('session.store')
    );
});
require app_path().'/filters.php';
