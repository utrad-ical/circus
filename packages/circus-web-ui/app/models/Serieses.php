<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Series table operation
 * @since 2014/12/05
 */
class Serieses extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Series';

	protected $primaryKey = 'seriesUID';

	/**
	 * Search conditions Building
	 * @param $query Query object
	 * @param $input Input value
	 * @return Query object
	 * @since 2014/12/05
	 */
	public function scopeAddWhere($query, $input) {
		//seriesID Series ID
		if (isset($input['seriesUID']) && $input['seriesUID']) {
			//Series table of series UID
			if (is_array($input['seriesUID']))
				$query->whereIn('seriesUID', $input['seriesUID']);
			else
				$query->where('seriesUID', 'like', '%'.$input['seriesUID'].'%');
		}

		//seriesDescription seriesDescription
		if (isset($input['seriesDescription']) && $input['seriesDescription']) {
			//SeriesDescription series table
			$query->where('seriesDescription', 'like', '%'.$input['seriesDescription'].'%');
		}

		//patientID Patient ID
		if (isset($input['patientID']) && $input['patientID']) {
			//PatientInfo.patientID series table
			$query->where('patientInfo.patientID', 'like', '%'.$input['patientID'].'%');
		}

		//patientName Name of patient
		if (isset($input['patientName']) && $input['patientName']) {
			//PatientInfo.patientName series table
			$query->where('patientInfo.patientName', 'like', '%'.$input['patientName'].'%');
		}

		//minAge The age of the patient (start)
		if (isset($input['minAge']) && $input['minAge']) {
			//PatientInfo.age series table
			$query->where('patientInfo.age', '>=', intval($input['minAge']));
		}

		//maxAge The age of the patient (the end)
		if (isset($input['maxAge']) && $input['maxAge']) {
			//PatientInfo.age series table
			$query->where('patientInfo.age', '<=', intval($input['maxAge']));
		}

		//sex Patient sex
		if (isset($input['sex']) && $input['sex']) {
			//PatientInfo.sex series table
			if ($input['sex'] != 'all')
				$query->where('patientInfo.sex', '=', $input['sex']);
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
		'studyUID'				=>	'required',
		'seriesUID'				=>	'required',
		'storageID'				=>	'required',
		'patientInfo.patientID'	=>	'required',
		'patientInfo.age'		=>	'required',
		'patientInfo.birthday'	=>	'required',
		'patientInfo.sex'		=>	'required',
		'patientInfo.height'	=>	'required|integer',
		'patientInfo.weight'	=>	'required|integer',
		'width'					=>	'required|integer',
		'height'				=>	'required|integer',
		'seriesDate'			=>	'required',
		'modality'				=>	'required',
		'seriesDescription'		=>	'required',
		'bodyPart'				=>	'required',
		'images'				=>	'required',
		'stationName'			=>	'required',
		'modelName'				=>	'required',
		'manufacturer'			=>	'required',
		'domain'				=>	'required'
	);

	/**
	 * I get the Validate rules
	 * This method When isValid now can use I delete
	 * @return Validate rules array
	 * @since 2014/12/15
	 */
	public static function getValidateRules() {
 		return array(
			'studyUID'				=>	'required',
			'seriesUID'				=>	'required',
			'storageID'				=>	'required',
			'patientInfo.patientID'	=>	'required',
			'patientInfo.age'		=>	'required',
			'patientInfo.birthday'	=>	'required',
			'patientInfo.sex'		=>	'required',
			'patientInfo.height'	=>	'required|integer',
			'patientInfo.weight'	=>	'required|integer',
			'width'					=>	'required|integer',
			'height'				=>	'required|integer',
			'seriesDate'			=>	'required',
			'modality'				=>	'required',
			'seriesDescription'		=>	'required',
			'bodyPart'				=>	'required',
			'images'				=>	'required',
			'stationName'			=>	'required',
			'modelName'				=>	'required',
			'manufacturer'			=>	'required',
			'domain'				=>	'required'
		);
	}

}
