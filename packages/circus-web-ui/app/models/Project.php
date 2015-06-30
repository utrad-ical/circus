<?php

/**
 * Model class for projects.
 *
 * Project schema:
 * @property number projectID Project ID.
 * @property string projectName Project name.
 * @property string description Project description.
 * @property string origin Project origin.
 * @property string url Project schema url.
 * @property array caseAttributesSchema List of attributes for cases.
 * @property array labelAttributesSchema List of attributes for labels.
 * @property string windowPriority Order of which window data takes precedence.
 * @property array windowPresets Array of window presets.
 *
 * Project privileges:
 * @property array readGroups List of groups which can view cases belonging to this project.
 * @property array addSeriesGroups List of groups which can create new case, or add a series to an existing case.
 * @property array writeGroups List of groups which can modify cases belonging to this project.
 * @property array moderateGroups List of groups which can delete cases, or do other administrative task of this project.
 * @property array viewPersonalInfoGroups List of groups which can view personal information belonging to this project.
 */
class Project extends BaseModel
{
	protected $connection = 'mongodb';

	const COLLECTION = 'Projects';
	protected $collection = self::COLLECTION;
	protected $primaryKey = 'projectID';

	//Authority constant

	/**
	 * Case creation role
	 */
	const AUTH_TYPE_READ = 'readGroups';

	/**
	 * Case viewing role
	 */
	const AUTH_TYPE_ADD_SERIES = 'addSeriesGroups';

	/**
	 * Case write role
	 */
	const AUTH_TYPE_WRITE = 'writeGroups';

	/**
	 * Case reviewing role
	 */
	const AUTH_TYPE_MODERATE = 'moderateGroups';

	/**
	 * View personal info role
	 */
	const AUTH_TYPE_VIEW_PERSONAL_INFO = 'viewPersonalInfoGroups';

	/**
	 * Returns the project name
	 * @param $projectID int Project ID
	 * @return string Project name
	 */
	public static function getProjectName($projectID) {
		$project = self::where('projectID', '=', $projectID)->get(array('projectName'));
		return $project ? $project[0]->projectName : '';
	}

	protected $rules = array(
		'projectID' => 'required|strict_string',
		'projectName' => 'required|strict_string',
		'description' => 'strict_string',
		'origin' => 'strict_string',
		'url' => 'strict_string',
		self::AUTH_TYPE_READ => 'array_of_group_ids',
		self::AUTH_TYPE_ADD_SERIES => 'array_of_group_ids',
		self::AUTH_TYPE_WRITE => 'array_of_group_ids',
		self::AUTH_TYPE_MODERATE => 'array_of_group_ids',
		self::AUTH_TYPE_VIEW_PERSONAL_INFO => 'array_of_group_ids',
		'windowPriority' => 'required|strict_string',
 		'windowPresets' => 'window_presets',
		'caseAttributesSchema' => 'strict_array',
		'labelAttributesSchema' => 'strict_array',
		'createTime'		=>	'mongodate',
		'updateTime'		=>	'mongodate'
	);

	protected $messages = array(
		'window_presets' => 'Invalid window presets.'
	);

}

Validator::extend('window_presets', function ($attribute, $value, $parameters) {
	if (!is_array($value)) return false;
	foreach ($value as $preset) {
		if (!is_array($preset) || count($preset) !== 3) return false;
		if (!isset($preset['label']) || !is_string($preset['label'])) return false;
		if (!isset($preset['level']) || !is_int($preset['level'])) return false;
		if (!isset($preset['width']) || !is_int($preset['width'])) return false;
	}
	return true;
});
