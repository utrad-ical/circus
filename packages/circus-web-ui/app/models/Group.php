<?php

/**
 * Model class for groups.
 * @property number groupID Group ID.
 * @property string groupName Group name.
 * @property array domains List of domain
 * @property array privileges List of privileges
 */
class Group extends BaseModel
{
	protected $connection = 'mongodb';

	const COLLECTION = 'Groups';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'groupID';

	const PROJECT_CREATE = 'createProject';
	const PROJECT_DELETE = 'deleteProject';
	const SERVER_MANAGE = 'manageServer';
	const PERSONAL_INFO_VIEW = 'personalInfoView';

	public static $privilegeList = [
		['privilege' => self::PROJECT_CREATE, 'caption' => 'Create Project'],
		['privilege' => self::PROJECT_DELETE, 'caption' => 'Delete Project'],
		['privilege' => self::SERVER_MANAGE, 'caption' => 'Manage Server'],
		['privilege' => self::PERSONAL_INFO_VIEW, 'caption' => 'View Personal Info']
	];

	/**
	 * Validate Rules
	 */
	protected $rules = [
		'groupID' => 'required|strict_integer|min:0',
		'groupName' => 'required|alpha_dash',
		'privileges' => 'array_of_privileges',
		'createTime' => 'mongodate',
		'updateTime' => 'mongodate',
		'domains' => 'array'
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
