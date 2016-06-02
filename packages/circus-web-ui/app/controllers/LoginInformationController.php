<?php

class LoginInformationController extends ApiBaseController {
	public function show()
	{
		$user = Auth::User();
		$userData = array_only(
			$user->toArray(),
			['userEmail', 'description', 'preferences']
		);
		$userData['privileges'] = $user->listPrivileges();
		$results = [
			'loginUser' => $userData,
			'domains' => [],
		];
		return Response::json($results);
	}
}
