<?php

/**
 * Model class for groups.
 * @property number groupID Group ID.
 * @property string groupName Group name.
 * @property array domains List of domain
 * @property array priviledges List of priviledge
 */
class Group extends BaseModel
{
	protected $connection = 'mongodb';

	const COLLECTION = 'Groups';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'groupID';

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
				foreach ($input['groupID'] as $group){
					Log::debug("GroupID::".$group);
					$groups[] = intval($group);
				}
			} else {
				$groups[] = intval($input['groupID']);
			}

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

	const PROJECT_CREATE = 'createProject';
	const PROJECT_DELETE = 'deleteProject';
	const SERVER_MANAGE = 'manageServer';

	public static $privilegeList = [
		['privilege' => self::PROJECT_CREATE, 'caption' => 'Create Project'],
		['privilege' => self::PROJECT_DELETE, 'caption' => 'Delete Project'],
		['privilege' => self::SERVER_MANAGE, 'caption' => 'Manage Server']
	];

	/**
	 * Validate Rules
	 */
	protected $rules = [
		'groupID' => 'required|strict_integer|min:0',
		'groupName' => 'required|alpha_dash',
		'privileges' => 'array_of_privileges',
		'createTime' => 'mongodate',
		'updateTime' => 'mongodate'
	];

	protected $messages = array(
		'groupID.strict_integer' => 'Please be groupID is set in numeric type .',
		'privileges.array_of_privileges' => 'Please set an array privileges .',
		'createTime.mongodate' => 'Please be createTime is set in mongodate type .',
		'updateTime.mongodate' => 'Please be updateTime is set in mongodate type .'
	);

	protected $uniqueFields = ['groupName'];

}


Validator::extend('array_of_privileges', function ($attribute, $value, $parameters) {
	if (!is_array($value)) return false;
	foreach ($value as $privilege) {
		$filtered = array_filter(Group::$privilegeList, function ($p) use ($privilege) {
			return $p['privilege'] == $privilege;
		});
		if (empty($filtered)) return false;
	}
	return true;
});
