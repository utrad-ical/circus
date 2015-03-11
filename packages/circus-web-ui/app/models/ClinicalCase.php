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
	 * Search conditions Building
	 * @param $query Query object
	 * @param $input Input value
	 * @return Query object
	 */
	public function scopeAddWhere($query, $input) {
		//projectID Project ID
		if (isset($input['project']) && $input['project']) {
			//Project ID of the case table
			//Since the int type that I want to change to int type
			$projects = array();
			foreach ($input['project'] as $prj){
				$projects[] = intval($prj);
			}
			$query->whereIn('projectID', $projects);
		} else {
			//Default condition :: login user can browse the groups that belong project
			$projects = Project::getProjectList(Project::AUTH_TYPE_VIEW);
			$query->whereIn('projectID', $projects);
		}

		//caseID Case ID
		if (isset($input['caseID']) && $input['caseID']) {
			//Of the case table caseID
			$query->where('caseID', 'like', '%'.$input['caseID'].'%');
		}
		//patientID Patient ID
		if (isset($input['patientID']) && $input['patientID']) {
			//PatientID of patientInfoCache in the objects of the Case table
			$query->where('patientInfoCache.patientID', 'like', '%'.$input['patientID'].'%');
		}

		//patientName Name of patient
		if (isset($input['patientName']) && $input['patientName']) {
			//Name of patientInfoCache in the objects of the Case table
			$query->where('patientInfoCache.patientName', 'like', '%'.$input['patientName'].'%');
		}

		//CreateDate Created Date
		if (isset($input['createDate']) && $input['createDate']) {
			$query->where(
				'createTime', '=',
				array(
					'$gte' => new MongoDate(strtotime($input['createDate'])),
					'$lte' => new MongoDate(strtotime($input['createDate'].' +1 day'))
				)
			);
		}

		//UpdateDate Updated date
		if (isset($input['updateDate']) && $input['updateDate']) {
			$query->where(
				'updateTime', '=',
				array(
					'$gte' => new MongoDate(strtotime($input['updateDate'])),
					'$lte' => new MongoDate(strtotime($input['updateDate'].' +1 day'))
				)
			);
		}

		//caseDate Case creation date
		if (isset($input['caseDate']) && $input['caseDate']) {
			$query->where(
				'latestRevision.date', '=',
				array(
					'$gte' => new MongoDate(strtotime($input['caseDate'])),
					'$lte' => new MongoDate(strtotime($input['caseDate'].' +1 day'))
				)
			);
		}
		return $query;
	}

	/**
	 * Limit / Offset setting
	 * @param $query Query object
	 * @param $input Retrieval conditions
	 * @return $query Query object
	 */
	public function scopeAddLimit($query, $input) {
		if (isset($input['perPage']) && $input['perPage']) {
			$query->skip(intval($input['disp'])*(intval($input['perPage'])-1));
		}
		$query->take($input['disp']);

		return $query;
	}

	/**
	 * Validation rules
	 */
	protected $rules = array(
		'caseID'			=>	'required',
		'incrementalID'		=>	'required|strict_integer',
		'projectID'			=>	'required|strict_integer',
		'patientInfoCache'	=>	'array',
		'latestRevision'	=>	'array',
		'revisions'			=>	'array',
		'creator'			=>	'required|integer',
		'createTime'		=>	'mongodate',
		'updateTime'		=>	'mongodate'
	);

	protected $messages = array(
		'projectID.strict_integer' => 'Please be projectID is set in numeric type .',
		'incrementalID.strict_integer' => 'Please be incrementalID is set in numeric type .',
		'patientInfoCache.array' => 'Please set an array patient information.',
		'latestRevision.array' => 'Please set an array latest revision.',
		'revisions.array' => 'Please set an array revisions.'
	);

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 */
	public function validate($data) {
		$validator = Validator::make($data, $this->rules);
/*
		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
		*/
		$errMsg = '';
		$validFlag = $validator->selfValidationFails($errMsg);

		return !$validFlag ? $errMsg : null;
	}
}
