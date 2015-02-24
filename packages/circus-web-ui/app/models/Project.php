<?php

/**
 * Model class for projects.
 * @property number projectID Project ID.
 * @property string projectName Project name.
 * @property array createGroups List of groups which can create new case for this project.
 * @property array viewGroups List of groups which can view cases belonging to this project.
 * @property array updateGroups List of groups which can modify cases belonging to this project.
 * @property array reviewGroups List of groups which can set 'reviewed' status for cases belonging to this project.
 * @property array deleteGroups List of groups which can delete cases from this project.
 * @property array personalInfoViewGroups List of groups which can view personal information.
 * @property string windowPriority Order of which window data takes precedence.
 * @property array windowPresets Array of window presets.
 * @property array caseAttributesSchema List of attributes for cases.
 * @property array labelAttributesSchema List of attributes for labels.
 */
class Project extends BaseModel
{
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
	 * Case deleting role
	 */
	const AUTH_TYPE_PERSONAL_INFO_VIEW = 'personalInfoViewGroups';

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

	protected $rules = array(
		'projectID' => 'required|strict_integer',
		'projectName' => 'required|strict_string',
		self::AUTH_TYPE_CREATE => 'required|array_of_group_ids',
		self::AUTH_TYPE_VIEW => 'required|array_of_group_ids',
		self::AUTH_TYPE_UPDATE => 'required|array_of_group_ids',
		self::AUTH_TYPE_REVIEW => 'required|array_of_group_ids',
		self::AUTH_TYPE_DELETE => 'required|array_of_group_ids',
		self::AUTH_TYPE_PERSONAL_INFO_VIEW => 'required|array_of_group_ids',
		'windowPriority' => 'required|strict_string',
 		'windowPresets' => 'array',
		'caseAttributesSchema' => 'array',
		'labelAttributesSchema' => 'array'
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
