<?php


use Jenssegers\Mongodb\Model as Eloquent;

class Cases extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Case';

	protected $primaryKey = 'caseID';

	/**
	 * 検索条件構築
	 * @param $query Queryオブジェクト
	 * @param $input 入力値
	 * @return Queryオブジェクト
	 * @author stani
	 * @since 2014/12/05
	 */
	public function scopeAddWhere($query, $input) {
		//projectID プロジェクトID
		if (isset($input['project']) && $input['project']) {
			//ケーステーブルのプロジェクトID
			//int型なのでint型に変更する
			$projects = array();
			foreach ($input['project'] as $prj){
				$projects[] = intval($prj);
			}
			$query->whereIn('projectID', $projects);
		} else {
			//デフォルト条件::ログインユーザが所属しているグループが閲覧可能なプロジェクト
			$projects = Projects::getProjectList(Projects::AUTH_TYPE_VIEW);
			$query->whereIn('projectID', $projects);
		}

		//caseID ケースID
		if (isset($input['caseID']) && $input['caseID']) {
			//ケーステーブルのcaseID
			$query->where('caseID', 'like', '%'.$input['caseID'].'%');
		}
		//patientID 患者ID
		if (isset($input['patientID']) && $input['patientID']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のpatientID
			$query->where('patientInfoCache.patientID', 'like', '%'.$input['patientID'].'%');
		}

		//patientName 患者名
		if (isset($input['patientName']) && $input['patientName']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のname
			$query->where('patientInfoCache.name', 'like', '%'.$input['patientName'].'%');
		}

		//CreateDate 作成日
		if (isset($input['createDate']) && $input['createDate']) {
			$query->where(
				'createTime', "=",
				array(
					'$gte' => new MongoDate(strtotime($input['createDate'])),
					'$lte' => new MongoDate(strtotime($input['createDate']." +1 day"))
				)
			);
		}

		//UpdateDate 更新日
		if (isset($input['updateDate']) && $input['updateDate']) {
			$query->where(
				'updateTime', "=",
				array(
					'$gte' => new MongoDate(strtotime($input['updateDate'])),
					'$lte' => new MongoDate(strtotime($input['updateDate']." +1 day"))
				)
			);
		}

		//caseDate ケース作成日
		if (isset($input['caseDate']) && $input['caseDate']) {
			$query->where(
				'revisions.latest.date', "=",
				array(
					'$gte' => new MongoDate(strtotime($input['caseDate'])),
					'$lte' => new MongoDate(strtotime($input['caseDate']." +1 day"))
				)
			);
		}

		//RevisionNo リビジョン番号
		if (isset($input['revisionNo'])) {
			$query->where('revisions', "=", $input["revisionNo"]);
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
		'caseID'						=>	'required',
		'incrementalID'					=>	'required|integer',
		'projectID'						=>	'required|integer',
		'date'							=>	'required|date',
		'patientInfoCache.patientID'	=>	'required',
		'patientInfoCache.age'			=>	'required|integer',
		'patientInfoCache.birthday'		=>	'required|date',
		'patientInfoCache.sex'			=>	'required'
	);

	/**
	 * Validateルールを取得する
	 * isValidが使えるようになったらこのメソッドは削除する
	 * @return Validateルール配列
	 * @author stani
	 * @since 2014/12/12
	 */
	public static function getValidateRules() {
 		return array(
			'caseID'						=>	'required',
			'incrementalID'					=>	'required|integer',
			'projectID'						=>	'required|integer',
			'date'							=>	'required|date',
			'patientInfoCache_patientID'	=>	'required',
			'patientInfoCache_age'			=>	'required|integer',
			'patientInfoCache_birthday'		=>	'required|date',
			'patientInfoCache_sex'			=>	'required'
		);
	}
}
