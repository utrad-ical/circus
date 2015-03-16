<?php


//use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Model class for series.
 * @property string studyUID
 * @property string seriesUID Series ID
 * @property number storageID ID indicating the storage location of the data
 * @property array patientInfo Patient information
 * @property number width Width of images
 * @property number height Height of images
 * @property string seriesDate Series creation date
 * @property string modality Creating type
 * @property string seriesDescription Description of series
 * @property string bodyPart Body site
 * @property string images Use image
 * @property string stationName Image creation device name
 * @property string modelName Image creation model name
 * @property string manufacturer Equipment manufacturers
 * @property array parameters Parameters
 * @property string receiveMethod Origin
 * @property string domain Domain
 */
class Series extends BaseModel {
	protected $connection = 'mongodb';

	const COLLECTION = 'Series';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'seriesUID';

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
	protected $rules = array(
		'studyUID'				  => 'required|strict_string',
		'seriesUID'				  => 'required|strict_string',
		'storageID'				  => 'required|strict_integer',
		'patientInfo'			  => 'strict_array',
		'patientInfo.patientID'	  => 'strict_string',
		'patientInfo.patientName' => 'strict_string',
		'patientInfo.age'		  => 'strict_integer',
		'patientInfo.birthDate'	  => 'strict_date',
		'patientInfo.sex'		  => 'in:F,M,O',
		'patientInfo.size'		  => 'strict_float',
		'patientInfo.weight'	  => 'strict_float',
		'width'					  => 'required|strict_integer',
		'height'				  => 'required|strict_integer',
		'seriesDate'			  => 'required|mongodate',
		'modality'				  => 'required|strict_string',
		'seriesDescription'		  => 'required|strict_string',
		'bodyPart'				  => 'required|strict_string',
		'images'				  => 'required|strict_string',
		'stationName'			  => 'required|strict_string',
		'modelName'				  => 'required|strict_string',
		'manufacturer'			  => 'required|strict_string',
		'parameters'			  => 'strict_array',
		'receiveMethod'			  => 'strict_string',
		'domain'				  => 'required|strict_string',
		'createTime'			  => 'mongodate',
		'updateTime'			  => 'mongodate'
	);

	protected $messages = array(
		'studyUID.strict_string' => 'Please be studyUID is set in string type .',
		'seriesUID.strict_string' => 'Please be seriesUID is set in string type .',
		'storageID.strict_integer' => 'Please be storageID is set in numeric type .',
		'patientInfo.strict_array' => 'Please set an array patientInfo.',
		'patientInfo.patientID.strict_string' => 'Please be patientID of patientInfo is set in string type .',
		'patientInfo.patientName.strict_string' => 'Please be patientName of patientInfo is set in string type .',
		'patientInfo.age.strict_integer' => 'Please be age of patientInfo is set in numeric type .',
		'patientInfo.birthDate.strict_date' => 'Please be birthDate of patientInfo is set in date type .',
		'patientInfo.size.strict_float' => 'Please be size of patientInfo is set in numeric type .',
		'patientInfo.weight.strict_float' => 'Please be weight of patientInfo is set in numeric type ,',
		'width.strict_integer' => 'Please be width is set in numeric type .',
		'height.strict_integer' => 'Please be height is set in numeric type .',
		'seriesDate.mongodate' => 'Please be seriesDate is set in mondodate type .',
		'modality.strict_string' => 'Please be modality is set in string type .',
		'seriesDescription.strict_string' => 'Please be seriesDescription is set in string type',
		'bodyPart.strict_string' => 'Please be bodyPart is set in string type .',
		'images.strict_string' => 'Please be images is set in string type .',
		'stationName.strict_string' => 'Please be images is set in string type .',
		'modelName.strict_string' => 'Please be modelName is set in string type .',
		'manufacturer.strict_string' => 'Please be manufacturer is set in string type .',
		'parameters.strict_array' => 'Please set an array parameters .',
		'receiveMethod.strict_string' => 'Please be receiveMethod is set in string type .',
		'domain.strict_string' => 'Please be domain is set in string type .',
		'createTime.mongodate' => 'Please be createTime is set in mongodate type .',
		'updateTime.mongodate' => 'Please be updateTime is set in mongodate type . '
	);

	public static function getImages($id) {
		$series = Series::find($id);
		return $series ? $series->images : '';
	}

	public static function getSeriesDescription($id){
		$series = self::find($id);
		return $series ? $series->seriesDescription : '';
	}
}
