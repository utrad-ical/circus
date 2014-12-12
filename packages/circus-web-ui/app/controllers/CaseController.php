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
	/*
	public function getIndex() {
		Log::debug("Get Search");
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//Getアクセスなのでページ番号が付与されていない場合は初期化
		$inputs = Input::all();

		Session::forget('case.search');

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
	*/

	/**
	 * ケース検索結果
	 * @author stani
	 * @since 2014/12/02
	 */
	public function search() {
		Log::debug("Post Search");
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$search_flg = true;
		$result = array();

		//入力値取得
		$inputs = Input::all();

		//Resetor初期表示ボタン押下時
		if (array_key_exists ('btnReset', $inputs) !== FALSE || !$inputs) {
			$search_flg = false;
			Session::forget('case.search');
		//検索ボタン押下時
		} else if (array_key_exists ('btnSearch', $inputs) !== FALSE) {
			if (array_key_exists ('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists ('sort', $inputs) === FALSE) $inputs['sort'] = 'updateTime';
			Session::put('case.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== FALSE) {
			$tmp = Session::get('case.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put('case.search', $tmp);
		}

		if ($search_flg) {
			//検索条件をセッションから取得
			$search_data = Session::get('case.search');

			//検索条件生成＆データ取得
			//取得カラムの設定
			$select_col = array(
				'caseID', 'projectID', 'incrementalID',
				'patientInfoCache.patientID', 'patientInfoCache.name',
				'revisions.latest.date', 'revisions.latest.creator',
				'updateTime'
			);

			//総件数取得
			$case_count = Cases::addWhere($search_data)
								->count();

			//paginate(10)という風にpaginateを使う場合はget(select句)が指定できない
			$case_list = Cases::addWhere($search_data)
								->orderby($search_data['sort'], 'desc')
								->addLimit($search_data)
								->get($select_col);

			//表示用に整形
			$list = array();
			foreach($case_list as $rec) {
				//患者情報
				$patient = $rec->patientInfoCache;

				//曜日取得
				$revision = $rec->revisions;
				$dt = $revision['latest']['date'];
				$w = self::getWeekDay(date('w', strtotime($dt)));

				//プロジェクト名
				$project = Projects::where('projectID', '=', $rec->projectID)->get();

				//表示用に整形する
				$list[] = array(
					'incrementalID' =>	$rec->incrementalID,
					'caseID'		=>	$rec->caseID,
					'projectID'		=>	$rec->projectID,
					'patientID'		=>	$patient['patientID'],
					'patientName' 	=>	$patient['name'],
					'latestDate' 	=>	date('Y/m/d('.$w.') H:i', $dt->sec),
					'creator'		=>	$revision['latest']['creator'],
					'projectName'	=>	$project ? $project[0]->projectName : '',
					'updateDate'	=>	date('Y/m/d', $rec->updateTime->sec)
				);
				$result["list"] = $list;
				//ページャーの設定
				$case_pager = Paginator::make(
					$list,
				//	count($case_list),
					$case_count,
					$search_data['disp']
				);
				$result['list_pager'] = $case_pager;
				$result['inputs'] = $search_data;
			}
		}

		$result['title'] = 'Case Search';
		$result['url'] = 'case/search';
		$result['search_flg'] = $search_flg;
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = self::getProjectList(true);

		return View::make('case/search', $result);
	}

	/**
	 * ケース詳細画面
	 * @author stani
	 * @since 2014/12/09
	 */
	public function detail() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//エラーメッセージ初期化
		$error_msg = "";
		$result = array();

		//POSTデータ取得
//		$inputs = Input::only(array("caseID", "revisionNo", "disp", "sort", "mode"));
		$inputs = Input::all();


//		if (!$inputs["caseID"]) {
		if (array_key_exists('caseID', $inputs) === FALSE)
			$error_msg = 'ケースIDを指定してください。';

		if (!$error_msg) {
			if (array_key_exists('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.search_display');
			if (array_key_exists('sort', $inputs) === FALSE) $inputs['sort'] = 'date';
			//存在するケースIDかチェック
			$case_info = Cases::addWhere($inputs)
								->get();

			if (!$case_info) {
				$error_msg = '存在しないケースIDです。';
			} else {
				$case_data = $case_info[0];
				//権限チェック
				//ケース閲覧権限
				$auth_view = Projects::getProjectList(Projects::AUTH_TYPE_VIEW, false);
				if (!$auth_view || array_search($case_data->projectID, $auth_view) === FALSE) {
					$error_msg = '該当のケースを参照する権限がありません。';
				}
			}
		}

		//エラーメッセージがない場合はケース詳細情報を表示する
		if (!$error_msg) {
			//ケース編集権限
			$auth_edit = Projects::getProjectList(Projects::AUTH_TYPE_UPDATE, false);
			$result['edit_flg'] = ($auth_edit && array_search($case_data->projectID, $auth_edit) !== FALSE) ?
						true: false;
			//ケース情報を表示用に整形
			//プロジェクト名
			$project = Projects::where("projectID", "=", $case_data->projectID)->get();
			$case_detail = array(
				'caseID'		=>	$case_data->caseID,
				'projectID'		=>	$case_data->projectID,
				'projectName'	=>	$project ? $project[0]->projectName : '',
				'patientID'		=>	$case_data->patientInfoCache['patientID'],
				'patientName'	=>	$case_data->patientInfoCache['name'],
				'birthday'		=>	$case_data->patientInfoCache['birthday'],
				'sex'			=>	self::getSex($case_data->patientInfoCache['sex'])
			);

			//Revision情報を表示用に整形
			$revision_list = array();
			$revision_no_list = array();
			$max_revision = 0;
			foreach($case_data->revisions as $key => $value) {
				//keyがlatestのものはCloneなので対象外とする
				if ($key !== 'latest') {
					//Revision番号が大きい場合はセット
					if ($max_revision < $key)
						$max_revision = $key;

					//ラベル数を求める
					$label_cnt = 0;
					foreach ($value['series'] as $rec) {
						$label_cnt += count($rec['labels']);
					}

					//曜日を求める
					$w = self::getWeekDay(date('w', $value['date']->sec));

					//表示用にリスト作成
					$revision_list[] = array(
						"revisionNo"	=>	$key,
						"editDate"		=>	date('Y/m/d('.$w.')', $value["date"]->sec),
						"editTime"		=>	date('H:i', $value["date"]->sec),
						"seriesCount"	=>	count($value["series"]),
						"labelCount"	=>	$label_cnt,
						"creator"		=>	$value["creator"],
						"memo"			=>	$value["memo"]
					);
					$revision_no_list[] = $key;
				}
			}
			$case_detail["revisionNo"] = isset($inputs["revisionNo"]) ? $inputs["revisionNo"] : $max_revision;
			$result["case_detail"] = $case_detail;
			$result["revision_list"] = $revision_list;
			$result['revision_no_list'] = $revision_no_list;

			//シリーズリスト作成
			$result['series_list'] = self::getSeriesList($case_data->revisions[$case_detail["revisionNo"]]);

			//ページャーの設定
			$revision_pager = Paginator::make(
				$revision_list,
				count($revision_list),
				isset($inputs["disp"]) ? $inputs["disp"] : 50
			);
			$result["list_pager"] = $revision_pager;
		} else {
			$result["error_msg"] = $error_msg;
		}
		$result["title"] = "Case Detail";
		$result["url"] = "case/detail";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting('detail');
		$result["mode"] = $inputs["mode"];
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

	/**
	 * 曜日を取得する
	 * @param $w 曜日を表す数値
	 * @return 日本語表記の曜日
	 * @author stani
	 * @since 2014/12/11
	 */
	function getWeekDay($w) {
		$week = Config::get('const.week_day');
		return $week[$w];
	}

	/**
	 * 表示用の性別を取得する
	 * @param $sex 性別の値
	 * @return 性別表示用文字列
	 * @author stani
	 * @since 2014/12/12
	 */
	function getSex($sex) {
		$sexes = Config::get('const.patient_sex');
		return $sexes[$sex];
	}

	/**
	 * シリーズコンボ作成用
	 * @param $data 選択されているRevisionデータ
	 * @return Revisionに紐づくシリーズリスト
	 * @author stani
	 * @since 2014/12/12
	 */
	function getSeriesList($data) {
		$series_list = array();
		foreach ($data["series"] as $key => $value) {
			$series_list[$value["seriesUID"]] = $value["seriesUID"];
		}
		return $series_list;
	}
}
