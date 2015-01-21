<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Series table operation
 */
class Series extends Eloquent {
	protected $connection = 'mongodb';

	const COLLECTION = 'Series';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'seriesUID';
	public $timestamps = false;

	public function storage() {
		return $this->belongsTo('Storage', 'storageID', 'storageID');
	}

	/**
	 * Search conditions Building
	 * @param $query Query object
	 * @param $input Input value
	 * @return Query object
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
	 */
	public function scopeAddLimit($query, $input) {
		if (isset($input['perPage']) && $input['perPage']) {
			$query->skip(intval($input['disp'])*(intval($input['perPage'])-1));
		}
		$query->take($input['disp']);

		return $query;
	}

	/**
	 * Deletes this series from DB, and also delete all associated DICOM files.
	 * @return bool|null
	 * @throws Exception
	 */
	public function deleteAssociatedImageFiles() {
		$path = $this->storage->dicomStoragePath($this->seriesUID);
		foreach (new DirectoryIterator($path) as $file) {
			if ($file->isFile()) {
				if (!unlink($file->getRealPath())) {
					return false;
				}
			}
		}
		if (!rmdir($path)) {
			return false;
		}
		return true;
	}

	/**
	 * Validation rules
	 */
	private $rules = array(
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
