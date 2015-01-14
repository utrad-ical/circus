<?php

use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Group table operation
 */
class Group extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Groups';

	protected $primaryKey = 'GroupID';

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 */
	public function scopeAddWhere($query, $input) {
		//GroupID Group ID
		if (isset($input['GroupID']) && $input['GroupID']) {
			$query->whereIn('GroupID', $input['GroupID']);
		}

		//GroupName Group Name
		if (isset($input['GroupName']) && $input['GroupName']) {
			//GroupName of Group table
			$query->where('GroupName', 'like', '%'.$input['GroupName'].'%');
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
		'GroupID'	=>	'required',
		'GroupName'	=>	'required|unique:Groups,GroupName'
	);

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 */
	public function validate($data) {
		$this->rules["GroupName"] = 'required|unique:Groups,GroupName,'.$data["GroupID"].",GroupID";
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}
}
