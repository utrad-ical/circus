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

	protected $messages = array(
		'projectID.strict_integer' => 'Please be projectID is set in numeric type .',
		'incrementalID.strict_integer' => 'Please be incrementalID is set in numeric type .',
		'patientInfoCache.strict_array' => 'Please set an array patient information.',
		'patientInfoCache.patientID.strict_string' => 'Please be patientID of patientInfoCache is set in string type .',
		'patientInfoCache.patientName.strict_string' => 'Please be patientName of patientInfoCache is set in string type .',
		'patientInfoCache.age.strict_integer' => 'Please be age of patientInfoCache is set in numeric type .',
		'patientInfoCache.birthDate.strict_date' => 'Please be birthDate of patientInfoCache is set in date type .',
		'patientInfoCache.size.strict_float' => 'Please be size of patientInfoCache is set in numeric type .',
		'patientInfoCache.weight.strict_float' => 'Please be weight of patientInfoCache is set in numeric type .',
		'latestRevision.strict_array' => 'Please set an array latestRevision.',
		'latestRevision.date.mongodate' => 'Please be date of latestRevision is set in mongodate type .',
		'latestRevision.creator.strict_integer' => 'Please be creator of latestRevision is set in numeric type .',
		'latestRevision.description.strict_string' => 'Please be description of latestRevision is set in string type .',
		'latestRevision.attributes.strict_array' => 'Please set an array attributes of latestRevision .',
		'latestRevision.status.strict_string' => 'Please be status of latestRevision is set in string type .',
		'latestRevision.series.strict_array' => 'Please set an array series of latestRevision .',
		'latestRevision.series.array_series' => 'Invalid series of latestRevision .',
		'revisions.strict_array' => 'Please set an array revisions .',
		'revisions.array_revision' => 'Invalid rivisions .',
		'creator.strict_integer' => 'Please be creator is set in numeric type .',
		'creator.is_user' => 'Invalid creator',
		'createTime.mongodate' => 'Please be createTime is set in mongodate type .',
		'updateTime.mongodate' => 'Please be updateTime is set in mongodate type .'
	);

	/**
	 * Revision内のラベルのValidateルール
	 */
	public static $label_rules = array(
		'id'			=>	'strict_string',
		'attributes'	=> 'strict_array'
	);

	/**
	 * Revision内のラベルのValidateメッセージ
	 */
	public static $label_messages = array(
		'id.strict_string' => 'Please be id of label is set in string type .',
		'attributes.strict_array' => 'Please set an array attributes of label.'
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
	 * Revision内のシリーズのValidateメッセージ
	 */
	public static $series_messages = array(
		'seriesUID.strict_string' => 'Please be seriesUID is set in string type .',
		'seriesUID.is_series'	  => 'Invalid seriesUID.',
		'images.strict_string'	  => 'Please be images of series is set in string type .',
		'labels.strict_array'	  => 'Please set an array labels of series .'
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
	 * RevisionのValidateメッセ―ジ
	 */
	public static $revision_message = array(
		'date.mongodate' 			=>  'Please be date of revision is set in mongodate type .',
		'creator.strict_integer'	=>	'Please be creator of revision is set in numeric type .',
		'description.strict_string' =>	'Please be description of revision is set in string type .',
		'attributes.strict_array'	=>	'Please set an array attributes of revision.',
		'status.strict_string'		=>	'Please be status of revision is set in string type .',
		'series.strict_array'		=>	'Please set an array series of revision.',
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
    public static function getCaseList($search_data) {
    	return self::where(function ($query) use ($search_data) {
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

						//詳細検索
						if ($search_data['search_mode'])
							$query->whereIn($search_data["mongo_data"]);
    				})
    				->orderby($search_data['sort'], 'desc')
    				/*
    				->skip(function($query) use ($search_data) {
    					if (isset($search_data['perPage']))
    						$query->skip(intval($search_data['disp'])*($search_data($input['perPage'])-1));
    				})
    				*/
    				->take($search_data['disp'])
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

}

Validator::extend('is_series', function($attribute, $value, $parameters) {
	return Series::find($value) ? true : false;
});

Validator::extend('array_labels', function($attribute, $value, $parameters) {
	foreach ($value as $label) {
		$validator = Validator::make($label, ClinicalCase::$label_rules, ClinicalCase::$label_messages);
		if ($validator->fails()) {
			$messages = $validator->messages();
			return false;
		}
	}
	return true;
});

Validator::extend('array_series', function($attribute, $value, $parameters) {
	foreach ($value as $series) {
		$validator = Validator::make($series, ClinicalCase::$series_rules, ClinicalCase::$series_messages);
		if ($validator->fails()) {
			$messages = $validator->messages();
			return false;
		}
	}
	return true;
});

Validator::extend('array_revision', function($attribute, $value, $parameters) {
	foreach ($value as $revision) {
		$validator = Validator::make($revision, ClinicalCase::$revision_rules, ClinicalCase::$revision_message);
		if ($validator->fails()) {
			$messages = $validator->messages();
			return false;
		}
	}
	return true;
});