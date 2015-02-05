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
		//groupID Group ID
		if (isset($input['groupID']) && $input['groupID']) {
			$groups = array();
			if (is_array($input['groupID'])) {
				Log::debug("===== GroupID Array =====");
				foreach ($input['groupID'] as $group){
					Log::debug("GroupID::".$group);
					$groups[] = intval($group);
				}
			} else {
				Log::debug("===== GroupID One =====");
				$groups[] = intval($input['groupID']);
			}
			Log::debug("===== SQL Bind Query =====");
			Log::debug($groups);
			//$query->whereIn('groupID', $input['groupID']);

			$query->whereIn('groupID', $groups);
		}

		//groupName Group Name
		if (isset($input['groupName']) && $input['groupName']) {
			//groupName of Groups table
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
		$this->rules['groupName'] = isset($data['_id']) ?
										'required|unique:Groups,groupName,'.$data["_id"].',_id' :
										$this->rules['groupName'];
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}
}
