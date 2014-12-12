<?php


use Jenssegers\Mongodb\Model as Eloquent;

class Serieses extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Series';

	protected $primaryKey = 'seriesUID';

	/**
	 * 検索条件構築
	 * @param $query Queryオブジェクト
	 * @param $input 入力値
	 * @return Queryオブジェクト
	 * @author stani
	 * @since 2014/12/05
	 */
	public function scopeAddWhere($query, $input) {
		//seriesID シリーズID
		if (isset($input['seriesUID']) && $input['seriesUID']) {
			//シリーズテーブルのシリーズUID
			$query->where('seriesUID', 'like', '%'.$input['seriesUID'].'%');
		}

		//seriesName シリーズ名
		if (isset($input['seriesName']) && $input['seriesName']) {
			//シリーズテーブルにいらっしゃらない・・・
		}

		//patientID 患者ID
		if (isset($input['patientID']) && $input['patientID']) {
			//シリーズテーブルのpatientInfo.patientID
			$query->where('patientInfo.patientID', 'like', '%'.$input['patientID'].'%');
		}

		//patientName 患者名
		if (isset($input['patientName']) && $input['patientName']) {
			//シリーズテーブルのpatientInfo.patientName
			$query->where('patientInfo.patientName', 'like', '%'.$input['patientName'].'%');
		}

		//minAge 患者の年齢(開始)
		if (isset($input['minAge']) && $input['minAge']) {
			//シリーズテーブルのpatientInfo.age
			$query->where('patientInfo.age', '>=', intval($input['minAge']));
		}

		//maxAge 患者の年齢(終了)
		if (isset($input['maxAge']) && $input['maxAge']) {
			//シリーズテーブルのpatientInfo.age
			$query->where('patientInfo.age', '<=', intval($input['maxAge']));
		}

		//sex 患者の性別
		if (isset($input['sex']) && $input['sex']) {
			//シリーズテーブルのpatientInfo.sex
			if ($input['sex'] != 'all')
				$query->where('patientInfo.sex', "=", $input['sex']);
		}

		return $query;
	}

	/**
	 * Limit/Offset設定
	 * @param $query Queryオブジェクト
	 * @param $input 検索条件
	 * @return $query Queryオブジェクト
	 * @author stani
	 * @since 2014/12/12
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
	 * @since 2014/12/12
	 */
	public static $rules = array(
		'studyUID'				=>	'required',
		'seriesUID'				=>	'required',
		'storageID'				=>	'required',
		'patientInfo.patientID'	=>	'required',
		'patientInfo.age'		=>	'required',
		'patientInfo.birthday'	=>	'required',
		'patientInfo.sex'		=>	'required',
		'patientInfo.height'	=>	'required',
		'patientInfo.weight'	=>	'required',
		'width'					=>	'required',
		'height'				=>	'required',
		'seriesDate'			=>	'required',
		'modality'				=>	'required',
		'seriesDescription'		=>	'required',
		'bodyPart'				=>	'required',
		'images'				=>	'required',
		'stationName'			=>	'required',
		'modelName'				=>	'required',
		'manufacturer'			=>	'required',
		'domain'				=>	'required'
	);
}
