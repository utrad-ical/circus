<?php

use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Group table operation
 */
class Group extends Eloquent {
	protected $connection = 'mongodb';

	const COLLECTION = 'Groups';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'groupID';
	public $timestamps = false;

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 */
	public function scopeAddWhere($query, $input) {
		// groupID Group ID
		if (isset($input['groupID']) && $input['groupID']) {
			$query->whereIn('groupID', $input['groupID']);
		}

		// groupName Group Name
		if (isset($input['groupName']) && $input['groupName']) {
			// groupName of Group table
			$query->where('groupName', 'like', '%'.$input['groupName'].'%');
		}

		return $query;
	}

	/**
	 * Limit / Offset setting
	 * @param $query Query Object
	 * @param $input Retrieval conditions
	 * @return $query Query Object
	 */
	public function scopeAddLimit($query, $input) {
		if (isset($input['perPage']) && $input['perPage']) {
			$query->skip(intval($input['disp'])*(intval($input['perPage'])-1));
		}
		$query->take($input['disp']);

		return $query;
	}

	/**
	 * Validate Rules
	 */
	private $rules = array(
		'groupID'	=>	'required|integer',
		'groupName'	=>	'required|unique:Groups,groupName'
	);

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 */
	public function validate($data) {
		$this->rules["groupName"] = 'required|unique:Groups,groupName,'.$data["groupID"].",groupID";
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}
}
