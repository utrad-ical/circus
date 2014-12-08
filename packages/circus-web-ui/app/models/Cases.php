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
		if ($input['project']) {
			//ケーステーブルのプロジェクトID
			//int型なのでint型に変更する
			$projects = array();
			foreach ($input['project'] as $prj){
				$projects[] = intval($prj);
			}
			$query->whereIn('projectID', $projects);
		} else {
			//デフォルト条件::ログインユーザが所属しているグループが閲覧可能なプロジェクト
			$query->whereIn('projectID', array_keys(Projects::getProjectList()));
		}

		//caseID ケースID
		if ($input['caseID']) {
			//ケーステーブルのcaseID
			$query->where('caseID', 'like', '%'.$input['caseID'].'%');
		}
		//patientID 患者ID
		if ($input['patientID']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のpatientID
			$query->where('patientInfoCache.patientID', 'like', '%'.$input['patientID'].'%');
		}

		//patientName 患者名
		if ($input['patientName']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のname
			$query->where('patientInfoCache.name', 'like', '%'.$input['patientName'].'%');
		}

		//InspectionDate 検査日
		if ($input['inspectionDate']) {
			Log::debug("検査日Where句生成");
			//どこのテーブル参照？
			//ここにSQL文
		}

		return $query;
	}


}
