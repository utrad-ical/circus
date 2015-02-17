<?php

/**
 * Base model class for
 */
class BaseModel extends Jenssegers\Mongodb\Model
{
	protected $rules = [];
	protected $messages = [];

	protected $uniqueFields = [];

	/**
	 * Run self-validation for the containing data.
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

}

// Custom validation rules

Validator::extend('mongodate', function ($attribute, $value, $parameters) {
	return $value instanceof MongoDate;
});

Validator::extend('strict_bool', function ($attribute, $value, $parameters) {
	return $value === true || $value === false;
});