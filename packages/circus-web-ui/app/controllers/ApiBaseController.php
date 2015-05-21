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
		// Anyone who wants to access this API must be property authenticated
		$this->beforeFilter('auth');
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