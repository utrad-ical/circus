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
			$project_ids = Projects::getProjectList(Projects::AUTH_TYPE_VIEW);
			$projects = array();
			foreach ($project_ids as $prj) {
				$projects[] = $prj->projectID;
			}
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
			Log::debug('作成日Where句生成');
			$yesterday = date("Y/m/d", strtotime($input['createDate']. "-1 day"));
			$tomorrow = date("Y/m/d", strtotime($input['createDate']. "+1 day"));
			$query->where('createTime', "=", array('$gt' => $yesterday, '$lt' => $tomorrow));
		}

		//UpdateDate 更新日
		if (isset($input['updateDate']) && $input['updateDate']) {
			Log::debug('更新日Where句生成');
			$yesterday = date("Y/m/d", strtotime($input['updateDate']. "-1 day"));
			$tomorrow = date("Y/m/d", strtotime($input['updateDate']. "+1 day"));
			$query->where('updateTime', "=", array('$gt' => $yesterday, '$lt' => $tomorrow));
		}

		//caseDate ケース作成日
		if (isset($input['caseDate']) && $input['caseDate']) {
			Log::debug("ケース作成日Where句生成");
			$yesterday = date("Y/m/d", strtotime($input['caseDate']. "-1 day"));
			$tomorrow = date("Y/m/d", strtotime($input['caseDate']. "+1 day"));
			$query->where('revisions.latest.date', "=", array('$gt' => $yesterday, '$lt' => $tomorrow));
		}

		//RevisionNo リビジョン番号
		if (isset($input['revisionNo']) && $input['revisionNo']) {
			Log::debug("リビジョン番号Where句作成");
			$query->where('revisions', "=", $input["revisionNo"]);
		}

		return $query;
	}


}
