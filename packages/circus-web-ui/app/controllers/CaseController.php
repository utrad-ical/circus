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

		//ログインユーザのグループが参照可能なプロジェクト一覧を取得
		$result["project_list"] = self::getProjectList();

		return View::make('case.search', $result);
	}

	/**
	 * ケース検索結果
	 * @author stani
	 * @since 2014/12/02
	 */
	public function search() {
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//入力値取得
		$inputs = Input::only(
				array("project", "caseID", "patientID", "patientName", "inspectionDate")
		);

		Log::debug("入力値");
		Log::debug($inputs);

		//検索条件生成＆データ取得
		$project_list = self::getProjectList();
		//取得カラムの設定
		$select_col = array(
				'caseID', 'projectID',
				'patientInfoCache.patientID', 'patientInfoCache.name',
				'revisions.latest.date', 'revisions.latest.creator',
			);

		//paginate(10)という風にpaginateを使う場合はget(select句)が指定できない
		$case_list = Cases::addWhere($inputs)
					//leftJoin("project", 'case.projectID', "=", "project.projectID")
							->orderby('caseID', 'desc')
							->get($select_col);

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

		$result = array();
		$result["title"] = "Case Search";
		$result["url"] = "case/search";
		$result["search_flg"] = true;
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();
		$result["list"] = $list;
		$result["user_name"] = Auth::user()->loginID;
		$result["project_list"] = $project_list;
		$result["inputs"] = $inputs;

		//ページャーの設定
		$case_pager = Paginator::make($list, count($case_list), 1);
		$result["list_pager"] = $case_pager;

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
	 * ページ個別のJSの設定を行う
	 * @return ページ個別のJS設定配列
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

	/**
	 * ログインユーザが閲覧可能なプロジェクトの一覧を取得する
	 * @return ログインユーザが閲覧可能なプロジェクトの一覧
	 * @author stani
	 * @since 2014/12/08
	 */
	function getProjectList(){
		return Projects::getProjectList();
	}
}
