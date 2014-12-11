<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Labelテーブル操作クラス
 * @author stani
 * @since 2014/12/11
 */
class Labels extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Label';

	protected $primaryKey = 'labelID';

	/**
	 * 検索条件構築
	 * @param $query Queryオブジェクト
	 * @param $input 入力値
	 * @return Queryオブジェクト
	 * @author stani
	 * @since 2014/12/11
	 */
	public function scopeAddWhere($query, $input) {

		return $query;
	}
}
