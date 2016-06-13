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
			['userEmail', 'description', 'preferences',
				'lastLoginIP']
		);

		$projects = $user->listAccessibleProjectsWithRoles();
		foreach ($projects as &$entry) {
			$entry['project'] = array_only(
				$entry['project']->toArray(),
				[
					'projectID', 'projectName', 'description',
					'caseAttributesSchema', 'labelAttributesSchema', 'tags'
				]
			);
		}

		$user_data = array_merge($user_data, [
			'lastLoginTime' => date('c', $user->lastLoginTime->sec),
			'privileges' => $user->listPrivileges(),
			'uploadFileSizeMax' => ini_get('upload_max_filesize'),
			'uploadFileMax' => intval(ini_get('max_file_uploads')),
			'dicomImageServer' => 'http://' . $_SERVER['SERVER_NAME'] . ':3000/',
			'accessibleDomains' => $user->listAccessibleDomains(),
			'accessibleProjects' => $projects,
			'defaultDomain' => ServerParam::getVal('defaultDomain')
		]);
		return Response::json($user_data);
	}
}
