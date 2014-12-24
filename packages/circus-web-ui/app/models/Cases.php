<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Case table operation
 * @since 2014/12/05
 */
class Cases extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Case';

	protected $primaryKey = 'caseID';

	/**
	 * Search conditions Building
	 * @param $query Query object
	 * @param $input Input value
	 * @return Query object
	 * @since 2014/12/05
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
			$projects = Projects::getProjectList(Projects::AUTH_TYPE_VIEW);
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
			$query->where('patientInfoCache.name', 'like', '%'.$input['patientName'].'%');
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
				'revisions.latest.date', '=',
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
	 * @since 2014/12/12
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
	 * @since 2014/12/12
	 */
	public static $rules = array(
		'caseID'						=>	'required',
		'incrementalID'					=>	'required|integer',
		'projectID'						=>	'required|integer',
		'patientInfoCache.patientID'	=>	'required',
		'patientInfoCache.age'			=>	'required|integer',
		'patientInfoCache.birthday'		=>	'required|date',
		'patientInfoCache.sex'			=>	'required'
	);

	/**
	 * I get the Validate rules
	 * This method When isValid now can use I delete
	 * @return Validate rules array
	 * @since 2014/12/12
	 */
	public static function getValidateRules() {
 		return array(
			'caseID'						=>	'required',
			'incrementalID'					=>	'required|integer',
			'projectID'						=>	'required|integer',
			'patientInfoCache_patientID'	=>	'required',
			'patientInfoCache_age'			=>	'required|integer',
			'patientInfoCache_birthday'		=>	'required|date',
			'patientInfoCache_sex'			=>	'required'
		);
	}
}
