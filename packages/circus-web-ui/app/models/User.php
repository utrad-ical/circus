<?php

use Illuminate\Auth\UserTrait;
use Illuminate\Auth\UserInterface;

/**
 * User model
 *
 * @property string userEmail The user ID
 * @property string loginID The login ID
 * @property string password The hashed password
 * @property array groups List of groups to which this user belongs
 * @property array preferences
 * @property bool loginEnabled
 * @property MongoDate lastLoginTime
 * @property string lastLoginIP
 */
class User extends BaseModel implements UserInterface {
	use UserTrait;

	const COLLECTION = 'Users';
	protected $collection = self::COLLECTION;
	protected $primaryKey = 'userEmail';
	protected $uniqueFields = ['loginID'];

	/**
	 * @var array privileges of this user
	 */
	private $privileges;

	/**
	 * @var array list of accessible domains
	 */
	private $domains;

	protected $rules = array(
		'userEmail' 	=>	'required|strict_string',
        'loginID'		=>	'required|alpha_dash|max:20',
		'password'		=>	'required',
		'groups'		=>	'required|array_of_group_ids',
		'preferences' 	=>	'required|preferences',
		'loginEnabled' 	=>	'required|strict_bool',
		'lastLoginTime' =>	'mongodate',
		'lastLoginIP' 	=>	'',
		'description'	=>	'',
		'createTime'	=>	'mongodate',
		'updateTime'	=>	'mongodate'
    );

	public function groups() {
		return $this->belongsToMany('Group', null, 'groups', 'groupID');
	}

	/**
	 * Validate Check
	 * @param array $data Validate checked
	 * @return Error content
	 * @deprecated Do not use. Use selfValidate
	 */
	public function validate($data) {
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}

	/**
	 * Checks if this user has the specified privilege
	 * @param string $priv_name The privilege to be checked.
	 * @return boolean True if this user has the specified privilege.
	 */
	public function hasPrivilege($priv_name) {
		if (!$priv_name)
			return false;
		$this->listPrivileges();
		return array_search($priv_name, $this->privileges) !== false;
	}

	/**
	 * Fetches the list of all privileges this user has.
	 * @return array The list.
	 */
	public function listPrivileges() {
		if (!$this->privileges) {
			$result = array();
			foreach ($this->groups as $group) {
				$data = Group::find($group);
				foreach ($data->privileges as $priv) {
					if (array_search($priv, $result) === false)
						$result[] = $priv;
				}
			}
			$this->privileges = $result;
		}
		return $this->privileges;
	}

	public function listAccessibleDomains() {
		if (!$this->domains) {
			$result = array();
			foreach ($this->groups as $group) {
				$data = Group::find($group);
				foreach ($data->domains as $domain) {
					if (array_search($domain, $result) === false)
						$result[] = $domain;
				}
			}
			$this->domains = $result;
		}
		return $this->domains;
	}

	public function listAccessibleProjects($type = Project::AUTH_TYPE_READ, $as_assoc = false)
	{
		$project_list = Project::whereIn($type, $this->groups)->get(array('projectID', 'projectName'));
		$results = array();
		if ($project_list) {
			foreach ($project_list as $project) {
				if ($as_assoc)
					$results[$project->projectID] = $project->projectName;
				else
					$results[] = $project->projectID;
			}
		}
		return $results;
	}

	/**
     * ケースアクセス権限
     * @param string $case_id ケースID
     * @return boolean アクセス権限がある場合true、ない場合false
	 */
	public function isAccessibleCase($case_id) {
		$query = ClinicalCase::where('caseID','=', $case_id);

		//setting accesible projects
		$projects = $this->listAccessibleProjects(Project::AUTH_TYPE_READ);
		$query->whereIn('projectID', $projects);

		//setting accesible domains
    	$accessible_domains = $this->listAccessibleDomains();
    	if ($accessible_domains) {
    		$domain_str = '';
    		foreach($accessible_domains as $key => $val) {
    			$accessible_domains[$key] = '"'.$val.'"';
    		}
    		$domain_str = implode(',', $accessible_domains);

    		$json_default_search = '{"domains":{"$not":{"$elemMatch":{"$nin":['.$domain_str.']}}}}';
    		$query->whereRaw(json_decode($json_default_search));
    	}

    	$res = $query->first();

		return $res ? true : false;
	}

	/**
	 * シリーズアクセス権限
	 * @param string $series_id シリーズID
	 * @return boolean アクセス権限がある場合はtrue、ない場合はfalse
	 */
	public function isAccessibleSeries($series_id = null) {
		$domains = $this->listAccessibleDomains();
		if (count($domains) == 0)
			return false;

		if ($series_id !== null) {
			//シリーズIDが指定されている場合は該当シリーズのドメインを取得する
			$series = Series::find($series_id);
			if (array_search($series->domain, $domains) === false)
				return false;
		}

		return true;
	}

	/**
	 * ケース編集権限チェック
	 * @param string $projectId プロジェクトID
	 * @return boolean 編集権限がある場合true、ない場合false
	 */
	public function isEditCase($project_id) {
		return ($this->hasProjectPrivileges(Project::AUTH_TYPE_WRITE, $project_id)
				|| $this->hasProjectPrivileges(Project::AUTH_TYPE_MODERATE, $project_id));
	}

	/**
	 * プリジェクト権限保持チェック
	 * @param String $auth_type 権限種別
	 * @param String $project_id プロジェクトＩＤ
	 * @return boolean 対象のプロジェクトの該当権限を保持している場合はtrue、保持していない場合はfalse
	 */
	public function hasProjectPrivileges($auth_type, $project_id) {
		$privilege = $this->listAccessibleProjects($auth_type);
		if ($privilege && array_search($project_id, $privilege) !== false)
			return true;
	}

	/**
	 * シリーズ追加権限チェック
	 * @param string $projectId プロジェクトID
	 * @return boolean シリーズ追加権限がある場合はtrue、ない場合はfalse
	 */
	public function isAddSeries($project_id) {
		return ($this->hasProjectPrivileges(Project::AUTH_TYPE_ADD_SERIES, $project_id));
	}

}

Validator::extend('preferences', function ($attribute, $value, $parameters) {
	return is_array($value)
		&& isset($value['theme'])
		&& $value['theme'] === 'mode_white' || $value['theme'] === 'mode_black'
		&& isset($value['personalInfoView'])
		&& $value['personalInfoView'] === true || $value['personalInfoView'] === false;
});
