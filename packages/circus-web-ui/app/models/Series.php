<?php

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
		'patientInfo.size'		  => 'strict_numeric',
		'patientInfo.weight'	  => 'strict_numeric',
		'width'					  => 'required|strict_integer',
		'height'				  => 'required|strict_integer',
		'seriesDate'			  => 'required|mongodate',
		'modality'				  => 'strict_string',
		'seriesDescription'		  => 'strict_string',
		'bodyPart'				  => 'strict_string',
		'images'				  => 'required|strict_string',
		'stationName'			  => 'strict_string',
		'modelName'				  => 'strict_string',
		'manufacturer'			  => 'strict_string',
		'parameters'			  => 'strict_array',
		'receiveMethod'			  => 'strict_string',
		'domain'				  => 'required|strict_string',
		'createTime'			  => 'mongodate',
		'updateTime'			  => 'mongodate'
	);

	public static function getImages($id) {
		$series = Series::find($id);
		return $series ? $series->images : '';
	}

	public static function getSeriesDescription($id){
		$series = self::find($id);
		return $series ? $series->seriesDescription : '';
	}

	public static function getPluralSeries($ids) {
		return self::whereIn('seriesUID', $ids)
				   ->get();
	}

	public static function getSeriesList($search_data, $count = false)
	{
		//個人情報閲覧権限有
		if (Auth::user()->hasPrivilege(Group::PERSONAL_INFO_VIEW))
			return self::getPersonalSeriesList($search_data, $count);

		//個人情報閲覧権限なし
		return self::getNonPersonalSeriesList($search_data, $count);
	}

	public static function getPersonalSeriesList($search_data, $count = false) {
		$sql = self::where(function ($query) use ($search_data) {
			//seriesID Series ID
			if (strlen($search_data['seriesUID']) > 0)
				$query->where('seriesUID', 'like', '%' . $search_data['seriesUID'] . '%');

			if (mb_strlen($search_data['seriesDescription']) > 0)
				$query->where('seriesDescription', 'like', '%' . $search_data['seriesDescription'] . '%');

			if (strlen($search_data['patientID']) > 0)
				$query->where('patientInfo.patientID', 'like', '%' . $search_data['patientID'] . '%');

			if (mb_strlen($search_data['patientName']) > 0)
				$query->where('patientInfo.patientName', 'like', '%' . $search_data['patientName'] . '%');

			if (strlen($search_data['minAge']) > 0)
				$query->where('patientInfo.age', '>=', intval($search_data['minAge']));

			if (strlen($search_data['maxAge']) > 0)
				$query->where('patientInfo.age', '<=', intval($search_data['maxAge']));

			if ($search_data['sex'] && $search_data['sex'] !== 'all')
				$query->where('patientInfo.sex', '=', $search_data['sex']);
		});

		//参照可能なドメイン
		$sql->whereIn('domain', Auth::user()->listAccessibleDomains());

		if ($count)
			return $sql->count();

		$offset = 0;
		if (isset($search_data['perPage']) && $search_data['perPage'])
			$offset = intval($search_data['disp']) * (intval($search_data['perPage']) - 1);

		return $sql->orderby($search_data['sort'], $search_data['order_by'])
			->take($search_data['disp'])
			->skip($offset)
			->get();
	}

	public static function getNonPersonalSeriesList($search_data, $count = false) {
		$sql = self::where(function ($query) use ($search_data) {
			//seriesID Series ID
			if ($search_data['seriesUID'])
				$query->where('seriesUID', 'like', '%' . $search_data['seriesUID'] . '%');

			if ($search_data['seriesDescription'])
				$query->where('seriesDescription', 'like', '%' . $search_data['seriesDescription'] . '%');
		});

		//参照可能なドメイン
		$sql->whereIn('domain', Auth::user()->listAccessibleDomains());

		if ($count)
			return $sql->count();

		$offset = 0;
		if (isset($search_data['perPage']) && $search_data['perPage'])
			$offset = intval($search_data['disp']) * (intval($search_data['perPage']) - 1);

		return $sql->orderby($search_data['sort'], $search_data['order_by'])
			->take($search_data['disp'])
			->skip($offset)
			->select(
				'studyUID',
				'seriesUID',
				'storageID',
				'width',
				'height',
				'seriesDate',
				'modality',
				'seriesDescription',
				'bodyPart',
				'images',
				'stationName',
				'modelName',
				'manufacturer',
				'parameters',
				'receiveMethod',
				'domain',
				'createTime',
				'updateTime'
			)
			->get();
	}

	/**
	 * Get the token of node authentication
	 * @param string $seriesUID seriesUID
	 */
	public static function authNode($seriesUID)
	{
		$request_url = "http://localhost:3000/requestToken?series=" . $seriesUID;
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $request_url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$tmp = curl_exec($ch);

		if (!$tmp)
			new AuthenticationNodeException('Node authentication error.');

		$responseToken = json_decode($tmp, true);
		curl_close($ch);

		if (!$responseToken || !array_key_exists('token', $responseToken))
			throw new AuthenticationNodeException(
				'Failed to load DICOM image server token. ' .
				'Is the DICOM image server up and properly configured?'
			);

		return $responseToken['token'];
	}

	/**
	 * Get the domain of the series information
	 * @param array $seriesIds Array of the seriesUID
	 * @return array domains of the series
	 * @throws Exception
	 */
	public static function getDomains($seriesIds)
	{
		$domains = array();
		$seriesList = self::getPluralSeries($seriesIds);
		if (!$seriesList || count($seriesIds) !== count($seriesList))
			throw new Exception("Series don't exist includes.");

		foreach ($seriesList as $series) {
			$domains[] = $series->domain;
		}
		return array_unique($domains);
	}
}