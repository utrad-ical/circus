<?php

use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Model class for projects.
 */
class Project extends Eloquent {
	protected $connection = 'mongodb';

	const COLLECTION = 'Projects';
	protected $collection = self::COLLECTION;
	protected $primaryKey = 'projectID';
	public $timestamps = false;

	//Authority constant

	/**
	 * Case creation role
	 */
	const AUTH_TYPE_CREATE = 'createGroups';

	/**
	 * Case viewing role
	 */
	const AUTH_TYPE_VIEW = 'viewGroups';

	/**
	 * Case update role
	 */
	const AUTH_TYPE_UPDATE = 'updateGroups';

	/**
	 * Case reviewing role
	 */
	const AUTH_TYPE_REVIEW = 'reviewGroups';

	/**
	 * Case deleting role
	 */
	const AUTH_TYPE_DELETE = 'deleteGroups';

	/**
	 * List all projects where the current user has access with the given authority type.
	 * @return Project login user operable List
	 * @param $auth_gp string Authority type
	 * @param $make_combo bool Combo element generation flag
	 */
	public static function getProjectList($auth_gp, $make_combo = false){
		$project_list = self::whereIn($auth_gp, Auth::user()->groups)
							->get(array('projectID', 'projectName'));
		$projects = array();
		//Combo generation
		if ($project_list) {
			foreach ($project_list as $project) {
				if ($make_combo)
					$projects[$project->projectID] = $project->projectName;
				else
					$projects[] = $project->projectID;
			}
		}
		return $projects;
	}

	/**
	 * Returns the project name
	 * @param $projectID int Project ID
	 * @return string Project name
	 */
	public static function getProjectName($projectID) {
		$project = self::where('projectID', '=', intval($projectID))->get(array('projectName'));
		return $project ? $project[0]->projectName : '';
	}

	/**
	 * Validation rules
	 * @var rules Validate rules array
	 */
	private $rules = array(
		'projectID'		=>	'required|integer',
		'projectName'	=>	'required'
	);

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 */
	public function validate($data) {
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}

}
