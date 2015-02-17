<?php

/**
 * Model class for Storage area.
 *
 * @property int storageID int Storage ID.
 * @property string type Storage type, either 'dicom' or 'label'.
 * @property string path Path to the storage area.
 * @property bool active Whether this storage is in use.
 */
class Storage extends BaseModel {
	protected $connection = 'mongodb';

	const COLLECTION = 'Storages';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'storageID';
	public $timestamps = false;

	/**
	 * Indicates this storage area is for storing DICOM files.
	 */
	const DICOM_STORAGE = 'dicom';

	/**
	 * Indicates this storage area is for storing label data.
	 */
	const LABEL_STORAGE = 'label';

	/**
	 * @param $type string The storage type.
	 * @return Storage The current active storage.
	 */
	static function getCurrentStorage($type) {
		return self::where(array('active' => true, 'type' => $type))->firstOrFail();
	}

	function dicomStoragePath($series_uid) {
		$hash = hash('sha256', trim($series_uid));
		return $this->path . '/' . substr($hash, 0, 2) . '/' . substr($hash, 2, 2) . '/' . $series_uid;
	}

	function dicomFileName($instance_id) {
		return sprintf('%08d.dcm', $instance_id);
	}

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 */
	public function scopeAddWhere($query, $input) {
		//storageID
		if (isset($input['storageID']) && $input['storageID']) {
			//Of the Storages table storageID
			$query->where('storageID', '=', intval($input['storageID']));
		}

		//type
		if (isset($input['type']) && $input['type']) {
			//Of the Storages table type
			$query->where('type', '=', $input['type']);
		}

		//active
		if (isset($input['active'])) {
			//Of the active table active
			$query->where('active', '=', $input['active']);
		}
		return $query;
	}

	/**
	 * Validate Rules
	 */
	protected $rules = array(
		'storageID'	=> 'required|integer|min:1',
		'type'		=> 'required|in:dicom,label',
		'path'		=> 'required|writable_directory',
		'active'	=> 'required|strict_bool'
	);

	protected $messages = array(
		'path.writable_directory' => 'The path does not exist or it is not writable.'
	);

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 * @deprecated
	 */
	public function validate($data) {
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}
}


Validator::extend('array_of_group_ids', function($attribute, $value, $parameters) {
	if (!is_array($value)) return false;
	foreach ($value as $groupID) {
		if (!is_numeric($groupID) || Group::find($groupID)->count() == 0) {
			return false;
		}
	}
	return true;
});

Validator::extend('writable_directory', function($attribute, $value, $parameters) {
	return is_dir($value) && is_writable($value);
});
