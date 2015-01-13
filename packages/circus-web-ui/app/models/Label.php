<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Label table manipulation class
 * @since 2014/12/11
 */
class Label extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Labels';

	protected $primaryKey = 'labelID';

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 * @since 2014/12/11
	 */
	public function scopeAddWhere($query, $input) {

		return $query;
	}

	/**
	 * Validate Rules
	 * @since 2015/01/07
	 */
	private $rules = array(
	);

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 * @since 2015/01/07
	 */
	public function validate($data) {
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}
}
