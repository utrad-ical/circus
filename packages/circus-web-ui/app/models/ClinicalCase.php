<?php


/**
 * Model class for cases.
 *
 * @property string caseID Case ID
 * @property number incrementalID
 * @property number projectID ProjectID of projects
 * @property array patientInfoCache Cache of Series patientInfo
 * @property array latestRevision Latest revision
 * @property array revisions List of revision
 * @property number ceator Case creater ID
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
		'incrementalID'					=>	'required|strict_integer',
		'projectID'						=>	'required|strict_integer',
		'patientInfoCache'				=>	'strict_array',
		'patientInfoCache.patientID'	=>	'strict_string',
		'patientInfoCache.patientName'	=>	'strict_string',
		'patientInfoCache.age'			=>	'strict_integer',
		'patientInfoCache.birthDate'	=>	'strict_date',
		'patientInfoCache.sex'			=>	'min:1|max:1|in:F,M,O',
		'patientInfoCache.size'			=>	'strict_float',
		'patientInfoCache.weight'		=>	'strict_float',
		'latestRevision'				=>	'strict_array',
		'latestRevision.date'			=>	'mongodate',
		'latestRevision.creator'		=>	'strict_integer',
		'latestRevision.description'	=>	'strict_string',
		'latestRevision.attributes'		=>	'strict_array',
		'latestRevision.status'			=>	'strict_string',
		'latestRevision.series'			=>	'strict_array|array_series',
		'revisions'						=>	'strict_array|array_revision',
		'creator'						=>	'required|strict_integer|is_user',
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
		'creator'  		=> 'strict_integer',
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
    						$projects = array();
							foreach ($search_data['project'] as $prj){
								$projects[] = intval($prj);
							}
    					} else {
    						$projects = Project::getProjectList(Project::AUTH_TYPE_VIEW);
    					}
    					$query->whereIn('projectID', $projects);

						//詳細検索
						if ($search_data['search_mode']) {
							$query->whereRaw(json_decode($search_data["mongo_data"]));
						//簡易検索
						} else {
							//CaseID
	    					if ($search_data['caseID'])
	    						$query->where('caseID', 'like', '%'.$search_data['caseID'].'%');

	    					//PatientID
	    					if ($search_data['patientID'])
	    						$query->where('patientInfoCache.patientID', 'like', '%'.$search_data['patientID'].'%');

	    					//PatientName
	    					if ($search_data['patientName'])
	    						$query->where('patientInfoCache.patientName', 'like', '%'.$search_data['patientName'].'%');

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

    	return $sql->orderby($search_data['sort'], 'desc')
    			   ->take($search_data['disp'])
    			   ->skip($offset)
    			   ->get();
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
				return 'Series that can be registered in one case only the same patient.<br>Please select the same patient in the series.';
			$series_list[$rec->seriesUID] = $rec->seriesDescription;
		}
	}

	public static function getLabelList($search_data) {
		$case_info = ClinicalCase::find($search_data['caseID']);
		$label_list = array();

		foreach ($case_info->revisions as $idx => $revision) {
			if ($idx === intval($search_data['revisionNo'])) {
				foreach($revision['series'] as $series) {
					if ($series['seriesUID'] === $search_data['seriesUID']) {
						foreach ($series['labels'] as $label) {
							$label_list[] = $label['id'];
						}
					}
				}
			}
		}
		return $label_list;
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