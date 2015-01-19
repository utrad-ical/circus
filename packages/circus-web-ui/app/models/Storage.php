<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Storage table manipulation class
 */
class Storage extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Storages';

	protected $primaryKey = 'storageID';

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 */
	public function scopeAddWhere($query, $input) {
		//storageID
		if (isset($inputs['storageID']) && $input['storageID']) {
			//Of the Storages table storageID
			$query->where('storageID', '=', intval($input['storageID']));
		}
		return $query;
	}

	/**
	 * Validate Rules
	 */
	private $rules = array(
		'storageID'	=>	'required',
		'active'	=>	'required'
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
