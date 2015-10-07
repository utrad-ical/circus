<?php

/**
 * Base model class for other models.
 * @property MongoDate createTime Document creation time.
 * @property MongoDate updateTime Document update time.
 */
class BaseModel extends Jenssegers\Mongodb\Model
{
	protected $rules = [];
	protected $messages = [];

	protected $uniqueFields = [];

	const CREATED_AT = 'createTime';
	const UPDATED_AT = 'updateTime';

	public function __set($key, $value)
	{
		if (array_key_exists($key, $this->rules) === false) {
			throw new InvalidModelException("property '$key' is undefined");
		}
		parent::__set($key, $value);
	}

	public function getRules() {
		return $this->rules;
	}

	/**
	 * Run self-validation for the containing data.
	 * @param array $messages Error message
	 * @return array Error content
	 */
	public function selfValidationFails(&$messages)
	{
		$attributes = $this->getAttributes();
		$rules = $this->rules;
		$id = $attributes[$this->primaryKey];
		foreach ($this->uniqueFields as $uf) {
			$rule = isset($rules[$uf]) ? $rules[$uf] : '';
			if (is_string($rule)) $rule = explode('|', $rule);
			$rule[$uf] = "unique:$this->collection,$uf,$id,$this->primaryKey";
		}
		$validator = Validator::make($attributes, $this->rules, $this->messages);
		if ($validator->fails()) {
			$messages = $validator->messages();
			return true;
		} else {
			return false;
		}
	}

	public function getPrimaryKey()
	{
		return $this->primaryKey;
	}

	/**
     * Override parent's save() method and adds self-validation.
	 * @param array $options
	 * @return boolean Registration result
     */
    public function save(array $options = array())
    {
	    $errors = null;
		if ($this->selfValidationFails($errors)) {
			Log::debug($errors->all());
			throw new InvalidModelException($errors);
		} else {
			return parent::save();
		}
    }
}

// Custom validation rules

Validator::extend('mongodate', function ($attribute, $value, $parameters) {
	return $value instanceof MongoDate;
});

Validator::extend('strict_integer', function ($attribute, $value, $parameters) {
	// Do not use is_numeric() which returns true for strings representing numeric
	return is_int($value);
});

Validator::extend('strict_string', function ($attribute, $value, $parameters) {
	return is_string($value);
});

Validator::extend('strict_bool', function ($attribute, $value, $parameters) {
	return $value === true || $value === false;
});

Validator::extend('strict_date', function ($attribute, $value, $parameters) {
	list($y, $m, $d) = explode('-',$value);
	return checkdate($m, $d, $y);
});

Validator::extend('strict_numeric', function($attribute, $value, $parameters) {
	return is_float($value) || is_int($value);
});

Validator::extend('array_of_group_ids', function($attribute, $value, $parameters) {
	if (!is_array($value)) return false;
	foreach ($value as $groupID) {
		if (!is_numeric($groupID) || !Group::find($groupID)) {
			return false;
		}
	}
	return true;
});

Validator::extend('strict_array', function($attribute, $value, $parameters) {
	return is_array($value);
});


Validator::extend('is_user', function($attribute, $value, $parameters) {
	return User::find($value) ? true : false;
});

Validator::extend('strict_json', function($attribute, $value, $parameters) {
	return $value instanceof stdClass;
});