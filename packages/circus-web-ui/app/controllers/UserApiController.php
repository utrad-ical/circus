<?php

class UserApiController extends ResourceApiBaseController
{
	protected $targetClass = 'User';
	protected $fields = ['userID', 'loginID', 'groups', 'description', 'loginEnabled', 'preferences'];
	protected $settable = ['loginID', 'groups', 'description', 'loginEnabled', 'preferences'];

	protected $tmp_password = null;

	protected function showFilter(array &$item)
	{
		parent::showFilter($item);

		// Flatten preferences so the property editor handle this
		$preferences = array_pull($item, 'preferences');
		foreach ($preferences as $k => $v) $item["preferences.$k"] = $v;
	}

	protected function beforeAssignFilter(array &$item, $isNew)
	{
		// Temporarily saves the password field,
		// which is optional and can not be mass-assigned
		if (strlen($item['password']) > 0) {
			$this->tmp_password = $item['password'];
		}
		unset($item['password']);

		// De-flatten preferences
		$tmp = [];
		foreach ($item as $k => $v) array_set($tmp, $k, $v);
		$item = $tmp;
	}

	protected function beforeUpdateFilter($model, $isNew)
	{
		// Restores the password field, when it's specified
		if ($this->tmp_password) {
			$model->password = (new CustomHasher())->make($this->tmp_password);
		}
	}
}