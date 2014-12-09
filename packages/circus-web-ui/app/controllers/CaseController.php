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
		$result["title"] = "Case Search";
		$result["url"] = "case/search";
		$result["search_flg"] = false;
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		//ログインユーザのグループが参照可能なプロジェクト一覧を取得
		$result["project_list"] = self::getProjectList(true);

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

		Log::debug("POSTデータ");
		Log::debug($_POST);

		//入力値取得
		$inputs = Input::only(
				array(
					"project", "caseID", "patientID", "patientName",
					"updateDate", "createDate", "caseDate",
					"btnName", "sort", "disp"
				)
			);

		Log::debug("入力値");
		Log::debug($inputs);

		//検索条件生成＆データ取得
		//$project_list =
		//取得カラムの設定
		$select_col = array(
				'caseID', 'projectID', 'incrementalID',
				'patientInfoCache.patientID', 'patientInfoCache.name',
				'revisions.latest.date', 'revisions.latest.creator'
			);

		//paginate(10)という風にpaginateを使う場合はget(select句)が指定できない
		$case_list = Cases::addWhere($inputs)
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
				"incrementalID" =>	$rec->incrementalID,
				"caseID"		=>	$rec->caseID,
				"projectID"		=>	$rec->projectID,
				"patientID"		=>	$patient["patientID"],
				"patientName" 	=>	$patient["name"],
				"latest_date" 	=>	date('Y/m/d('.$w.') H:i', strtotime($dt)),
				"creator"		=>	$revision["latest"]["creator"],
				"projectName"	=>	$project ? $project[0]->projectName : '',
				"update_date"	=>	$rec->updateTime
			);
		}

		$result = array();
		$result["title"] = "Case Search";
		$result["url"] = "case/search";
		$result["search_flg"] = true;
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();
		$result["list"] = $list;
		$result["project_list"] = self::getProjectList(true);
		$result["inputs"] = $inputs;

		//ページャーの設定
		$case_pager = Paginator::make($list, count($case_list), 10);
		$result["list_pager"] = $case_pager;

		return View::make('case/search', $result);
	}

	/**
	 * ケース詳細画面
	 * @author stani
	 * @since 2014/12/09
	 */
	public function detail() {
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//エラーメッセージ初期化
		$error_msg = "";
		$result = array();

		//POSTデータ取得
		$inputs = Input::only(array("caseID", "revisionNo"));

		if (!$inputs["caseID"]) {
			$error_msg = "ケースIDを指定してください。";
		}

		if (!$error_msg) {
			//存在するケースIDかチェック
			//$case_info = Cases::where("caseID", "=", $inputs["caseID"])->get();
			$case_info = Cases::addWhere($inputs)
								->get();

			if (!$case_info) {
				$error_msg = "存在しないケースIDです。";
			} else {
				//権限チェック
				//ケース閲覧権限
				$auth_view = Projects::getProjectList(Projects::AUTH_TYPE_VIEW, false);
				if (!$auth_view || array_search($case_info->projectID, $auth_view) === FALSE) {
					$error_msg = "該当のケースを参照する権限がありません。";
				}
			}
		}

		//エラーメッセージがない場合はケース詳細情報を表示する
		if (!$error_msg) {
			//ケース編集権限
			$auth_edit = Projects::getProjectList(Projects::AUTH_TYPE_UPDATE, false);
			$resutl["edit_flg"] = ($auth_edit && array_search($case_info->projectID, $auth_edit) !== FALSE) ?
						true: false;
			//ケース情報を表示用に整形
			//プロジェクト名
			$project = Projects::where("projectID", "=", $case_detail->projectID)->get();
			$case_detail = array(
				"caseID"		=>	$case_info->caseID,
				"projectID"		=>	$case_info->projectID,
				"projectName"	=>	$project ? $project[0]->projectName : ''
			);
			//Revision情報を表示用に整形
			$revision_list = array();
			$max_revision = 0;
			foreach($case_info as $key => $value) {
				//keyがlatestのものはCloneなので対象外とする
				if ($key != 'latest') {
					//Revision番号が大きい場合はセット
					if ($max_revision < $key)
						$max_revision = $key;

					$label_cnt = 0;
					foreach ($value["series"] as $rec) {
						$label_cnt += count($rec["labels"]);
					}
					$revision_list[] = array(
						"revisionNo"	=>	$key,
						"editDateTime"	=>	$value["date"],
						"seriesCount"	=>	count($value["series"]),
						"labelCount"	=>	$label_cnt,
						"editorName"	=>	$creator,
						"editorMemo"	=>	''
					);
				}
			}
			$result["revision_list"] = $revision_list;
		} else {
			$result["error_msg"] = $error_msg;
		}
		$result["title"] = "Case Detail";
		$result["url"] = "case/detail";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting('detail');
		return View::make("/case/detail", $result);
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
	function jsSetting($mode = 'search') {
		$js = array();
		$js["jquery-ui.min.js"] = "js/jquery-ui.min.js";

		switch ($mode) {
			case 'search':
				$js["jquery.multiselect.min.js"] = "js/jquery.multiselect.min.js";
				$js["jquery.formserializer.js"] = "js/jquery.formserializer.js";
				$js["jquery.ruleseteditor.js"] = "js/jquery.ruleseteditor.js";
				break;
			case 'detail':
			case 'edit':
				$js["img_edit.js"] = "js/img_edit.js";
				break;
			case 'revision':
				$js["jquery.simple-color-picker.js"] = "/js/jquery.simple-color-picker.js";
				$js["voxelContainer.js"] = "/js/voxelContainer.js";
				$js["imageViewer.js"] = "/js/imageViewer.js";
				$js["imageViewerController.js"] = "/js/imageViewerController.js";
				break;
		}
		return $js;
	}

	/**
	 * ログインユーザが閲覧可能なプロジェクトの一覧を取得する
	 * @return ログインユーザが閲覧可能なプロジェクトの一覧
	 * @author stani
	 * @since 2014/12/08
	 */
	function getProjectList($make_combo_flg){
		return Projects::getProjectList(Projects::AUTH_TYPE_VIEW, $make_combo_flg);
	}
}
