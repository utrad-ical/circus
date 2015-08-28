<?php


/**
 * Model class for cases.
 *
 * @property string caseID Case ID
 * @property number projectID ProjectID of projects
 * @property array patientInfoCache Cache of Series patientInfo
 * @property array tags Tags of case
 * @property array latestRevision Latest revision
 * @property array revisions List of revision
 * @property array domains List of domain
 */
class ClinicalCase extends BaseModel {
	protected $connection = 'mongodb';

	const COLLECTION = 'Cases';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'caseID';

	/**
	 * export data type
	 */
	const DATA_TYPE_ORIGINAL = 1;
	const DATA_TYPE_LABEL = 2;
	const DATA_TYPE_ORIGINAL_LABEL = 3;

	/**
	 * export output type
	 */
	const OUTPUT_TYPE_SEPARATE = 1;
	const OUTPUT_TYPE_COMBI = 2;

	/**
	 * Validation rules
	 */
	protected $rules = array(
		'caseID'						=>	'required',
		'projectID'						=>	'required|strict_string',
		'patientInfoCache'				=>	'strict_array',
		'patientInfoCache.patientID'	=>	'strict_string',
		'patientInfoCache.patientName'	=>	'strict_string',
		'patientInfoCache.age'			=>	'strict_integer',
		'patientInfoCache.birthDate'	=>	'strict_date',
		'patientInfoCache.sex'			=>	'min:1|max:1|in:F,M,O',
		'patientInfoCache.size'			=>	'strict_numeric',
		'patientInfoCache.weight'		=>	'strict_numeric',
		'tags'							=>	'strict_array',
		'latestRevision'				=>	'strict_array',
		'latestRevision.date'			=>	'mongodate',
		'latestRevision.creator'		=>	'strict_string',
		'latestRevision.description'	=>	'strict_string',
		'latestRevision.attributes'		=>	'strict_array',
		'latestRevision.status'			=>	'strict_string',
		'latestRevision.series'			=>	'strict_array|array_series',
		'revisions'						=>	'strict_array|array_revision',
		'domains'						=>  'strict_array',
		'createTime'					=>	'mongodate',
		'updateTime'					=>	'mongodate'
	);

	/**
	 * Revision内のラベルのValidateルール
	 */
	public static $label_rules = array(
		'id'			=>	'strict_string',
		'attributes'	=> 'strict_array'
	);

	/**
	 * Revision内のシリーズのValidateルール
	 */
	public static $series_rules = array(
		'seriesUID'	=>	'required|strict_string|is_series',
		'images'	=>	'required|strict_string',
		'labels'	=>	'strict_array|array_labels'
	);

	/**
	 * RevisionのValidateルール
	 */
	public static $revision_rules = array(
		'date'   		=> 'mongodate',
		'description' 	=> 'strict_string',
		'attributes'  	=> 'strict_array',
		'status'   		=> 'strict_string',
		'series'   		=> 'strict_array|array_series'
	);

	/**
	 * リレーション設定(ProjectID)
	 * @author stani
	 * @since 2015/03/20
	 */
	public function project()
    {
        return $this->belongsTo('Project', 'projectID', 'projectID');
    }

    /**
     * ケース一覧取得
     * @param Array $search_data 検索条件
     * @return ケース一覧
     * @author stani
     * @since 2015/03/20
     */
    public static function getCaseList($search_data, $count = false) {
    	$sql = self::where(function ($query) use ($search_data) {
    					//ProjectID
    					$search_data['project'] = json_decode($search_data['project'], true);
    					if ($search_data['project']) {
    						$projects = array_values($search_data['project']);
    					} else {
    						$projects = Auth::user()->listAccessibleProjects(Project::AUTH_TYPE_READ);
    					}
    					$query->whereIn('projectID', $projects);

    					//accesible domain
    					$accessible_domains = Auth::user()->listAccessibleDomains();
    					$domain_str = '';
    					foreach($accessible_domains as $key => $val) {
    						$accessible_domains[$key] = '"'.$val.'"';
    					}
    					$domain_str = implode(',', $accessible_domains);
    					$json_default_search = '{"domains":{"$not":{"$elemMatch":{"$nin":['.$domain_str.']}}}}';
	    				$query->whereRaw(json_decode($json_default_search));

						//詳細検索
						if ($search_data['search_mode']) {
							$query->whereRaw(json_decode($search_data["mongo_data"]));
						//簡易検索
						} else {
							//CaseID
	    					if ($search_data['caseID'])
	    						$query->where('caseID', 'like', '%'.$search_data['caseID'].'%');
							if (Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW)) {
		    					//PatientID
		    					if ($search_data['patientID'])
		    						$query->where('patientInfoCache.patientID', 'like', '%'.$search_data['patientID'].'%');

		    					//PatientName
		    					if ($search_data['patientName'])
		    						$query->where('patientInfoCache.patientName', 'like', '%'.$search_data['patientName'].'%');
							}
	    					//createDate
	    					if ($search_data['createDate']) {
	    						$query->where(
									'createTime', '=',
									array(
										'$gte' => new MongoDate(strtotime($search_data['createDate'])),
										'$lte' => new MongoDate(strtotime($search_data['createDate'].' +1 day'))
									)
								);
	    					}

							//updateDate
	    					if ($search_data['updateDate']) {
	    						$query->where(
									'updateTime', '=',
									array(
										'$gte' => new MongoDate(strtotime($search_data['updateDate'])),
										'$lte' => new MongoDate(strtotime($search_data['updateDate'].' +1 day'))
									)
								);
	    					}

					    	//caseDate
							if ($search_data['caseDate']) {
								$query->where(
									'latestRevision.date', '=',
									array(
										'$gte' => new MongoDate(strtotime($search_data['caseDate'])),
										'$lte' => new MongoDate(strtotime($search_data['caseDate'].' +1 day'))
									)
								);
							}
							//tags
							if (isset($search_data['tags'])) {
								$tags = json_decode($search_data['tags'], true);
								if ($tags) {
	    							$query->whereIn('tags', array_values($tags));
								}
							}
						}
    				});

    	//件数取得
    	if ($count)
    		return $sql->count();

    	//リスト取得
    	//settings offset
    	$offset = 0;
    	if (isset($search_data['perPage']) && $search_data['perPage'])
    		$offset = intval($search_data['disp'])*(intval($search_data['perPage'])-1);

		$sql->orderby($search_data['sort'], $search_data['order_by']);

    	if ($search_data['disp'] !== 'all')
    		$sql->take($search_data['disp']);

    	return $sql->skip($offset)->get();
    }

	/**
	 * Case ID created (SHA256 + uniqid)
	 * @return string that was turned into Hash in SHA256 the uniqid (case ID)
	 */
	public static function createCaseID(){
		return hash('sha256', uniqid());
	}

	/**
	 * Patient ID duplication check
	 * If there is no overlap I store the series list for display
	 * @param $list Series List of patient ID overlapping subject
	 * @param $series_list Destination Series List of if there is no error
	 * @return $error_msg Error message
	 */
	public static function checkDuplicatePatientID($list, &$series_list = array()) {
		$patientID = $list[0]->patientInfo['patientID'];
		foreach ($list as $rec) {
			if ($patientID != $rec->patientInfo['patientID'])
				return "Series that can be registered in one case only the same patient.\nPlease select the same patient in the series. ";
			$series_list[$rec->seriesUID] = $rec->seriesDescription;
		}
	}

	public static function getLabelList($search_data) {
		$case_info = self::find($search_data['caseID']);
		$label_list = array();

		foreach ($case_info->revisions as $idx => $revision) {
			if ($idx === intval($search_data['revisionNo'])) {
				foreach($revision['series'] as $series) {
					if ($series['seriesUID'] === $search_data['seriesUID']) {
						if (array_key_exists('labels', $series)) {
							foreach ($series['labels'] as $label) {
								$label_list[] = $label['id'];
							}
						}
					}
				}
			}
		}
		return $label_list;
	}

	/**
	 * ケース検索
	 * @param Array $inputs 入力値
	 * @param integer $preset_id 保存検索番号
	 */
	public static function searchCase($search_data, $preset_id = false) {
		$result = array();
		$search_flg = false;
		$result['project_list'] = Auth::user()->listAccessibleProjects(Project::AUTH_TYPE_READ, true);

		if ($search_data) {
			$search_flg = true;
			$result['list'] = ClinicalCase::getCaseList($search_data);
			$list_count = ClinicalCase::getCaseList($search_data, true);

			if (count($result['list']) > 0) {
				self::filterPersonalView($result['list']);
			}

			if ($result['list'] && $search_data['disp'] !== 'all' )
				$result['list_pager'] = Paginator::make(
											$result['list']->toArray(),
											$list_count,
											$search_data['disp']);
			$search_data['case_attributes'] = json_encode(
											      self::getProjectCaseAttribute(json_decode($search_data['project'], true))
											  );
		} else {
			$search_data['project'] = json_encode("");
			$search_data['search_mode'] = 0;
		}

		$result['inputs'] = $search_data;
		$result['search_flg'] = $search_flg;

		return $result;
	}

	public static function filterPersonalView(&$cases) {
		//プロジェクトの個人情報権限
		$projectPersonal = Auth::user()->listAccessibleProjects(Project::AUTH_TYPE_VIEW_PERSONAL_INFO);
		//グループの個人情報権限
		$groupPersonal = Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW);
		//ユーザの個人情報権限
		$userPersonal = Auth::user()->preferences["personalInfoView"];

		foreach ($cases as $idx => $case_obj) {
			if (array_search($case_obj->projectID, $projectPersonal) === false || !$groupPersonal || !$userPersonal) {
				//プロジェクトorグループorユーザの個人情報表示権限がないので個人情報系を空表示にする
				$cases[$idx]->patientInfoCache = array(
					'patientID'   => '',
					'patientName' => '',
					'age'         => '',
					'birthDate'   => '',
					'sex'         => '',
					'size'        => '',
					'weight'      => ''
				);
			}
		}
	}

	/**
	 * get the caseAttributesSchema of the project
	 * @param Json $projects selected projects
	 * @return Json the createAttributesSchema of the project
	 */
	public static function getProjectCaseAttribute($projects) {
		if (count($projects) === 1) {
			$project = Project::find($projects[0]);
			if ($project->caseAttributesSchema) {
				$case_attr = $project->caseAttributesSchema;
				foreach ($case_attr as $key => $val) {
					$case_attr[$key]['key'] = 'latestRevision.attributes.'.$val['key'];
				}
				return $case_attr;
			}

		}
		return;
	}

	/**
	 * get the Tags of the project
	 * @param Json $projects selected projects
	 * @return Json the tags of the project
	 */
	public static function getProjectTags($projects) {
		if (count($projects) === 1) {
			$project = Project::find($projects[0]);
			if ($project->tags) {
				$tag_list = array();
				$tags = $project->tags;
				foreach ($tags as $idx => $tag) {
					$tag_list[$idx] = $tag['name'];
				}
				return $tag_list;
			}

		}
		return array();
	}

	/**
	 * Add tags if they do not exist.
	 * @param array $tags The list of tags
	 */
	public function appendTags(array $tags)
	{
		if (!is_array($this->tags)) $this->tags = array();
		$this->tags = array_unique(array_merge($this->tags, $tags));
	}

	/**
	 * Remove tags if they exist.
	 * @param array $tags The list of tags
	 */
	public function removeTags(array $tags)
	{
		$tmp = is_array($this->tags) ? $this->tags : array();
		foreach ($tags as $tag) {
			$index = array_search($tag, $tmp);
			if ( $index !== false ) {
				unset($tmp[$index]);
			}
		}
		$this->tags = $tmp;
	}

	/**
	 * Save the case information
	 * @param Array $data Registration scheduled case data
	 * @param string $caseID caseID
	 */
	public static function saveCase($data, $caseID = null)
	{
		if (!$data)
			throw new Exception('登録するケース情報を設定してください。');

		$caseObj = $caseID ? self::find($caseID)
						   : App::make('ClinicalCase');
		foreach ($data as $key => $val) {
			$caseObj->$key = $val;
		}
		$caseObj->save();
	}
}

Validator::extend('is_series', function($attribute, $value, $parameters) {
	return Series::find($value) ? true : false;
});

Validator::extend('array_labels', function($attribute, $value, $parameters) {
	foreach ($value as $label) {
		$validator = Validator::make($label, ClinicalCase::$label_rules);
		if ($validator->fails()) {
			$messages = $validator->messages();
			return false;
		}
	}
	return true;
});

Validator::extend('array_series', function($attribute, $value, $parameters) {
	foreach ($value as $series) {
		$validator = Validator::make($series, ClinicalCase::$series_rules);
		if ($validator->fails()) {
			$messages = $validator->messages();
			return false;
		}
	}
	return true;
});

Validator::extend('array_revision', function($attribute, $value, $parameters) {
	foreach ($value as $revision) {
		$validator = Validator::make($revision, ClinicalCase::$revision_rules);
		if ($validator->fails()) {
			$messages = $validator->messages();
			return false;
		}
	}
	return true;
});
