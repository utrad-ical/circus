<?php
/**
 * ケース検索画面の操作を行うクラス
 * @author stani
 * @since 2014/12/02
 */
class CaseController extends BaseController {
	/**
	 * ケース検索画面
	 * @author stani
	 * @since 2014/12/02
	 */
	public function getIndex() {
		Log::debug("Index");
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//ログインしているのでケース検索画面の表示処理を行う
		$result = array();
		$result["user_name"] = Auth::user()->loginID;

		//プロジェクト情報取得
		//TODO::参照グループIDで絞り込み
		$projects = Cases::all();
		$result["project"] = $projects;
		$result["title"] = "Case Search";
		$result["url"] = "case/search";
		$result["search_flg"] = false;
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		//ログインユーザのグループ一覧取得
		//Log::debug("ユーザグループ一覧");
		//Log::debug(Auth::user()->groups);
		//$groups = explode(",",Auth::user()->groups);
		Log::debug("グループ一覧::");
		Log::debug(Auth::user()->groups);
		/*

		//ログインユーザのグループが参照可能なプロジェクト一覧を取得
		//$project = Projects::where('viewGroups', 'like', '%'.$groups);
		$project_list = Projects::all();
		$projects = array();
		foreach ($project_list as $project) {
			$projects[$project->projectID] = $project->projectName;
		}
		$result["project_list"] = $projects;
		*/
		$result["project_list"] = self::getProjectList();

		return View::make('case.search', $result);
	}

	/**
	 * ケース検索結果
	 * @author stani
	 * @since 2014/12/02
	 */
	public function search() {
		Log::debug("Search!!");
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//入力値取得
		$inputs = Input::only(
				array("project[]", "caseID", "patientID", "patientName", "InspectionDate")
		);

		Log::debug("入力値::");
		Log::debug($inputs);

		//Where文作成
		//projectID プロジェクトID
		$sql = array();
		$bind = array();
		if ($inputs['project[]']) {
			//ケーステーブルのプロジェクトID
			$sql[] = 'projectID = ?';
			$bind[] = $inputs['projectID'];
		}

		//caseID ケースID
		if ($inputs['caseID']) {
			//ケーステーブルのcaseID
			$sql[] = 'caseID = ?';
			$bind[] = $inputs['caseID'];
		}

		//patientID 患者ID
		if ($inputs['patientID']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のpatientID
			$sql[] = 'patientID = ?';
			$bind[] = $inputs['patientID'];
		}

		//patientName 患者名
		if ($inputs['patientName']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のname
			$sql[] = 'name like ?';
			$bind[] = '%'.$inputs['patientName'].'%';
		}

		//InspectionDate 検査日
		if ($inputs['InspectionDate']) {
			//どこのテーブル参照？
			//ここにSQL文
		}

		//Where句生成
		$where = $sql ? implode(' and ', $sql) : '';



		//本当は検索条件付加
		//検索結果を格納
		//$case_list = Cases::where('caseID', '=', 'Case AAA')
/*
		if ($where) {
			$case_list = Cases::orderby('caseID', 'desc')
							->addWhere($inputs)
							->paginate(10);
		} else {
		*/
			$case_list = Cases::addWhere($inputs)
								->orderby('caseID', 'desc')
								->paginate(10);
		//}

		$week_day = array('日', '月', '火', '水', '木', '金', '土');

		//表示用に整形
		$list = array();
		foreach($case_list as $rec) {
			//患者情報
			$patient = $rec->patientInfoCache;

			//曜日取得
			$revision = $rec->revisions;
			$dt = $revision["latest"]["date"];
			$w = $week_day[date('w', strtotime($dt))];

			//プロジェクト名
			$project = Projects::where("projectID", "=", $rec->projectID)->get();

			//表示用に整形する
			$list[] = array(
				"caseID"		=>	$rec->caseID,
				"projectID"		=>	$rec->projectID,
				"patientID"		=>	$patient["patientID"],
				"patientName" 	=>	$patient["name"],
				"latest_date" 	=>	date('Y/m/d('.$w.') H:i', strtotime($dt)),
				"creator"		=>	$revision["latest"]["creator"],
				"projectName"	=>	$project ? $project[0]->projectName : ''
			);
		}
/*
		Log::debug("表示用データ");
		foreach ($list as $data){
			Log::debug("======================");
			Log::debug($data);
		}
*/
		$result = array();
		$result["title"] = "Case Search";
		$result["url"] = "case/search";
		$result["search_flg"] = true;
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();
		$result["list"] = $list;
		$result["user_name"] = Auth::user()->loginID;
		$result["project_list"] = self::getProjectList();
		return View::make('case/search', $result);
	}



	/**
	 * ページ個別CSS設定
	 * @author stani
	 * @since 2014/12/04
	 */
	function cssSetting() {
		$css = array();
	  	$css["ui-lightness/jquery-ui-1.10.4.custom.min.css"] = "css/ui-lightness/jquery-ui-1.10.4.custom.min.css";
		$css["page.css"] = "css/page.css";
	  	return $css;
	}

	/**
	 * ページ個別JS設定
	 * @author stani
	 * @since 2014/12/04
	 */
	function jsSetting() {
		$js = array();
		$js["jquery-ui.min.js"] = "js/jquery-ui.min.js";
		$js["jquery.multiselect.min.js"] = "js/jquery.multiselect.min.js";
		$js["jquery.formserializer.js"] = "js/jquery.formserializer.js";
		$js["jquery.ruleseteditor.js"] = "js/jquery.ruleseteditor.js";

		return $js;
	}

	function getProjectList(){
		$project_list = Projects::all();
		$projects = array();
		foreach ($project_list as $project) {
			$projects[$project->projectID] = $project->projectName;
		}
		return $projects;
	}
}
