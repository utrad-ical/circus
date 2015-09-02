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
			if ($exception instanceof InvalidModelException) {
				return $this->errorResponse($exception->getErrors());
			} else {
				return $this->errorResponse($exception->getMessage(), 500);
			}
		});
	}

	protected function succeedResponse()
	{
		return Response::json(['status' => 'OK']);
	}

	protected function errorResponse($message, $status = 400)
	{
		return Response::json(['status' => 'NG', 'errors' => $message], $status); // Bad Request
	}

	public function __call($method, $parameters)
	{
		return $this->errorResponse('Invalid URL.', 404);
	}
}