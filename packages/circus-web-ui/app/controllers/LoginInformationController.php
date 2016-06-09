<?php

class LoginInformationController extends ApiBaseController {
	public function show()
	{
		$user = Auth::User();
		$user_data = array_only(
			$user->toArray(), ['userEmail', 'description']
		);
		return Response::json($user_data);
	}

	public function showFull()
	{
		$user = Auth::User();
		$user_data = array_only(
			$user->toArray(),
			['userEmail', 'description', 'preferences']
		);
		$user_data = array_merge($user_data, [
			'privileges' => $user->listPrivileges(),
			'uploadFileSizeMax' => ini_get('upload_max_filesize'),
			'uploadFileMax' => intval(ini_get('max_file_uploads')),
			'accessibleDomains' => $user->listAccessibleDomains(),
			'accessibleProjects' => $user->listAccessibleProjects(),
			'defaultDomain' => ServerParam::getVal('defaultDomain')
		]);
		return Response::json($user_data);
	}
}
