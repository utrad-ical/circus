<?php

use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Group table operation
 * @since 2014/12/16
 */
class Groups extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Group';

	protected $primaryKey = 'GroupID';

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 * @since 2014/12/16
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
	 * @since 2014/12/16
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
	 * @since 2014/12/16
	 */
	public static $rules = array(
		'GroupID'	=>	'required',
		'GroupName'	=>	'required'
	);

	/**
	 * I get the Validate rules
	 * This method When isValid now can use I delete
	 * @return Validate rules array
	 * @since 2014/12/16
	 */
	public static function getValidateRules() {
 		return array(
			'GroupID'	=>	'required',
			'GroupName'	=>	'required'
		);
	}
}
