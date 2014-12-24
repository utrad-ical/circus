<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Label table manipulation class
 * @since 2014/12/11
 */
class Labels extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Label';

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
}
