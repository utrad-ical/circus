<?php

use Jenssegers\Mongodb\Model as Eloquent;

class Groups extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Group';

	protected $primaryKey = 'GroupID';

	/**
	 * 検索条件構築
	 * @param $query Queryオブジェクト
	 * @param $input 入力値
	 * @return Queryオブジェクト
	 * @author stani
	 * @since 2014/12/16
	 */
	public function scopeAddWhere($query, $input) {
		//GroupID グループID
		if (isset($input['GroupID']) && $input['GroupID']) {
			//GroupテーブルのGroupID
		//	$query->where('GroupID', 'like', '%'.$input['GroupID'].'%');

			Log::debug('グループID一覧');
			Log::debug($input['GroupID']);
			/*
			$groups = array();
			foreach ($input['GroupID'] as $gp){
			//	Log::debug($gp);
				$groups[] = $gp;
			}
			Log::debug($groups);
			*/
			$query->whereIn('GroupID', $input['GroupID']);
		}

		//GroupName グループ名
		if (isset($input['GroupName']) && $input['GroupName']) {
			//GroupテーブルのGroupName
			$query->where('GroupName', 'like', '%'.$input['GroupName'].'%');
		}

		return $query;
	}

	/**
	 * Limit/Offset設定
	 * @param $query Queryオブジェクト
	 * @param $input 検索条件
	 * @return $query Queryオブジェクト
	 * @author stani
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
	 * バリデーションルール
	 * @author stani
	 * @since 2014/12/16
	 */
	public static $rules = array(
		'GroupID'	=>	'required',
		'GroupName'	=>	'required'
	);

	/**
	 * Validateルールを取得する
	 * isValidが使えるようになったらこのメソッドは削除する
	 * @return Validateルール配列
	 * @author stani
	 * @since 2014/12/16
	 */
	public static function getValidateRules() {
 		return array(
			'GroupID'	=>	'required',
			'GroupName'	=>	'required'
		);
	}
}
