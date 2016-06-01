<?php

class LoginInformationController extends ApiBaseController {
	public function show()
	{
		$results = [
			'loginUser' => array_only(
				Auth::User()->toArray(),
				['userEmail', 'description', 'preferences']
			),
			'domains' => [],
		];
		return Response::json($results);
	}
}
