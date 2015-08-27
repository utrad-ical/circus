<?php

/**
 * Base class for all JSON-based web API for CIRCUS DB.
 */
class ApiBaseController extends BaseController
{
	protected $targetClass = '';
	protected $fields = '';
	protected $settable = [];


	public function __construct()
	{
		$this->registerErrorHandler();
	}

	/**
	 * Overwrites the default exception handling defined in `start/global.php`.
	 */
	protected function registerErrorHandler()
	{
		App::error(function(Exception $exception) {
			Log::error($exception);
			return $this->errorResponse($exception->getMessage());
		});
	}

	protected function errorResponse($message)
	{
		return Response::json(['status' => 'NG', 'errors' => $message], 400); // Bad Request
	}

	public function __call($method, $parameters)
	{
		return Response::json('Invalid', 404);
	}
}