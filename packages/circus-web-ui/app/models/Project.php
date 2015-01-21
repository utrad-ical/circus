<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Class to perform the project table operation
 */
class Project extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Projects';
	protected $primaryKey = 'projectID';
	public $timestamps = false;

	//Authority constant
	const AUTH_TYPE_CREATE = 'createGroups';	//Case creation authority
	const AUTH_TYPE_VIEW = 'viewGroups';		//Case viewing authority
	const AUTH_TYPE_UPDATE = 'updateGroups';	//Case update authority
	const AUTH_TYPE_REVIEW = 'reviewGroups';	//Case Review authority
	const AUTH_TYPE_DELETE = 'deleteGroups';	//Case Delete authority

	/**
	 * Login user to get a list of projects that can be operated
	 * @return Project login user operable List
	 * @param $auth_gp Authority type
	 * @param $make_combo Combo element generation flag
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
	 * I get the project name
	 * @param $projectID Project ID
	 * @return Project name
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
