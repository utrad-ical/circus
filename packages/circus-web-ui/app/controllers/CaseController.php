<?php
/**
 * ケース検索画面の操作を行うクラス
 * @author stani
 * @since 2014/12/02
 */
class CaseController extends BaseController {
	/**
	 * ケース検索結果
	 * @author stani
	 * @since 2014/12/02
	 */
	public function search() {
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
	 * リビジョン検索結果
	 * @author stani
	 * @since 2014/12/15
	 */
	public function revision() {
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

		if (!$inputs) {
			$search_flg = false;
			Session::forget('revision.search');
		} else if (array_key_exists('page', $inputs) !== FALSE) {
			$tmp = Session::get('revision.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put('revision.search', $tmp);
		} else {
			if (array_key_exists ('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists ('sort', $inputs) === FALSE) $inputs['sort'] = 'revision.date';
			Session::put('revision.search', $inputs);
		}

		if ($search_flg) {
			//検索条件をセッションから取得
			$search_data = Session::get('revision.search');

			//検索条件生成＆データ取得
			//取得カラムの設定
			$select_col = array(
				'caseID', 'projectID',
				'patientInfoCache.patientID', 'patientInfoCache.name',
				'patientInfoCache.birthday', 'patientInfoCache.sex',
				'revisions'
			);

			//総件数取得
			$case_count = Cases::addWhere($search_data)
								->count();

			//paginate(10)という風にpaginateを使う場合はget(select句)が指定できない
			$case_list = Cases::addWhere($search_data)
								->orderby($search_data['sort'], 'desc')
								->addLimit($search_data)
								->get($select_col);
			$query_log = DB::getQueryLog();

			$case_data = $case_list[0];

			//表示用に整形
			$list = array();

			//プロジェクト名
			$project = Projects::where('projectID', '=', $case_data->projectID)->get();
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

			foreach($case_data->revisions as $key => $value) {
				//keyがlatestのものはCloneなので対象外とする
				if ($key !== 'latest') {
					//ラベル数を求める
					$label_cnt = 0;
					foreach ($value['series'] as $rec) {
						$label_cnt += count($rec['labels']);
					}

					//曜日を求める
					$w = self::getWeekDay(date('w', $value['date']->sec));

					//表示用にリスト作成
					$revision_list[] = array(
						'revisionNo'	=>	$key,
						'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
						'editTime'		=>	date('H:i', $value['date']->sec),
						'seriesCount'	=>	count($value['series']),
						'labelCount'	=>	$label_cnt,
						'creator'		=>	$value['creator'],
						'memo'			=>	$value['memo']
					);
				}
			}
			$result['case_detail'] = $case_detail;
			$result['revision_list'] = $revision_list;

			//ページャーの設定
			$revision_pager = Paginator::make(
				$revision_list,
				count($revision_list),
				$search_data['disp']
			);
			$result['list_pager'] = $revision_pager;
			$result['inputs'] = $search_data;
		}

		$result['title'] = 'Revision List';
		$result['url'] = 'case/revision';
		$result['search_flg'] = $search_flg;
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('case/revision', $result);
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
		$inputs = Input::all();

		if (array_key_exists('caseID', $inputs) === FALSE)
			$error_msg = 'ケースIDを指定してください。';

		if (!$error_msg) {
			if (array_key_exists('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists('sort', $inputs) === FALSE) $inputs['sort'] = 'date';

			Session::put('case.detail', $inputs);
			$search_data = Session::get('case.detail');

			//存在するケースIDかチェック
			$case_info = Cases::addWhere($search_data)
								->get();
			$query_log = DB::getQueryLog();

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
						'revisionNo'	=>	$key,
						'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
						'editTime'		=>	date('H:i', $value['date']->sec),
						'seriesCount'	=>	count($value['series']),
						'labelCount'	=>	$label_cnt,
						'creator'		=>	$value['creator'],
						'memo'			=>	$value['memo']
					);
					$revision_no_list[] = $key;
				}
			}
			$case_detail['revisionNo'] = isset($inputs['revisionNo']) ? $inputs['revisionNo'] : $max_revision;
			$result['case_detail'] = $case_detail;
			$result['revision_list'] = $revision_list;
			$result['revision_no_list'] = $revision_no_list;

			//シリーズリスト作成
			foreach ($case_data->revisions as $key => $value) {
				if ($key != 'latest') {
					$series[] = $value['seriesUID'];
				}
			}
			$inputs['seriesUID'] = $series;
			$serieses = Serieses::addWhere($inputs)
								->get($select_col);
			$result['series_list'] = self::getSeriesList($serieses);

			//ページャーの設定
			$revision_pager = Paginator::make(
				$revision_list,
				count($revision_list),
				$search_data['disp']
			);
			$result['list_pager'] = $revision_pager;
			$result['inputs'] = $search_data;
		} else {
			$result['error_msg'] = $error_msg;
		}
		$result['title'] = 'Case Detail';
		$result['url'] = 'case/detail';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting('detail');
		$result['mode'] = $inputs['mode'];
		return View::make('/case/detail', $result);
	}

	/**
	 * ケース登録入力
	 * @author stani
	 * @since 2014/12/15
	 */
	function input() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();
		$series_list = array();
		$error_msg = '';
		//入力値取得
		$inputs = Input::all();

		//ページ設定
		$result['title'] = 'Add new Case';
		$result['url'] = '/case/input';
		$result['back_url'] = '/series/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);

		if (array_key_exists('caseID', $inputs)) {
			$case_data = Cases::addWhere($inputs)
					->get();
			if ($case_data) {
				$result['inputs'] = $case_data[0];
				Session::put('id', $case_data[0]->_id);
			}

			$series = array();
			foreach ($case_data->revisions as $key => $value) {
				if ($key != 'latest') {
					$series[] = $value['seriesUID'];
				}
			}
			$inputs['seriesUID'] = $series;
			$serieses = Serieses::addWhere($inputs)
							->get($select_col);
		} else {
			$result['inputs'] = array('caseID' => self::createCaseID());

			//CookieからシリーズUID取得
			$cookie_series = $_COOKIE['seriesCookie'];
			$series_exclude_ary = explode("_" , $cookie_series);

			$inputs["seriesUID"] = $series_exclude_ary;
			$select_col = array(
				'seriesUID', 'seriesDescription',
				'patientInfo.patientID', 'patientInfo.age',
				'patientInfo.sex', 'patientInfo.patientName'
			);
			$series = Serieses::addWhere($inputs)
							->get($select_col);
		}

		//患者ID重複チェック
		$error_msg = self::checkDuplicatePatientID($series, $series_list);

		//エラーメッセージがなければシリーズ一覧を設定
		if ($error_msg) {
			$result['error_msg'] = $error_msg;
		} else {
			$result['series_list'] = $series_list;
			$patient = $series[0]->patientInfo;
			$patient['sex'] = self::getSex($patient['sex']);
			$result['patientInfo'] = $patient;

			//セッションに固定情報を格納
			$case_info = array(
				'caseID'	=>	$result['input']['caseID'],
				'series'	=>	$series,
				'patient'	=>	$patient
			);
			Session::put('case.input', $case_info);
		}
		return View::make('/case/input', $result);
	}

	/**
	 * ケース登録確認
	 */
	function confirm() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//入力値取得
		$inputs = Input::all();

		//セッション情報取得
		$id = Session::get('id');
		$case_info = Session::get('case.input');
		$case_info['projectID'] = $inputs['projectID'];

		//Validateチェック用オブジェクト生成
		$case_obj = $id ?
			Cases::find($id) : App::make('Cases');

		//Validateチェック用の値を設定
		$case_obj->caseID = $case_info['caseID'];
		$case_obj->incrementalID = 1;	//いったん固定
		$case_obj->projectID = $case_info['projectID'];
		$case_obj->date = new MongoDate(strtotime(date('Y-m-d H:i:s')));
		$case_obj->patientInfoCache = array(
			'patientID'	=>	$case_info['patient']['patientID'],
			'name'		=>	$case_info['patient']['patientName'],
			'age'		=>	$case_info['patient']['age'],
			'birthday'	=>	$case_info['patient']['birthday'],
			'sex'		=>	$case_info['patient']['sex']
		);

		//ValidateCheck
		$validator = Validator::make($inputs, Cases::getValidateRules());
		if ($validator->fails()) {
			//Validateエラー時の処理
			$result['title'] = 'Add new Case';
			$result['url'] = '/case/input';
			$result['back_url'] = '/series/search';
			$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);
			$result['errors'] = $validator->messages();
			return View::make('/case/input', $result);
		} else {
			//エラーがないので確認画面を表示
			$result['title'] = 'Add new Case Confirmation';
			$result['url'] = '/case/confirm';
			return View::make('/case/confirm', $result);
		}
	}

	/**
	 * ケース登録
	 * @author stani
	 * @since 2014/12/15
	 */
	function regist(){
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::all();
		$result['back_url'] = '/series/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Validateチェック用オブジェクト生成
		$case_obj = App::make('Cases');
		//Validateチェック用の値を設定
		$case_obj->caseID = $inputs['caseID'];
		$case_obj->incrementalID = $inputs['incrementalID'];
		$case_obj->projectID = $inputs['projectID'];
		$case_obj->date = $inputs['date'];
		$case_obj->patientInfoCache = array(
			'patientID'	=>	$inputs['patientInfoCache_patientID'],
			'name'		=>	$inputs['patientInfoCache_name'],
			'age'		=>	$inputs['patientInfoCache_age'],
			'birthday'	=>	$inputs['patientInfoCache_birthday'],
			'sex'		=>	$inputs['patientInfoCache_sex']
		);

		//ValidateCheck
		$validator = Validator::make($inputs, Cases::getValidateRules());
		if (!$validator->fails()) {
			//Validate成功時の処理
			//エラーがないので登録する
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$case_obj->updateTime = $dt;
			$case_obj->createTime = $dt;
			$case_obj->creator = Auth::user()->loginID;
			$case_obj->save();
			if (Session::get("id"))
				$result['title'] = 'Case Edit Complete';
			else
				$result['title'] = 'Add new Case Complete';
			$result['url'] = '/case/complete';
			$result["msg"] = "ケース情報の登録が完了しました。";
			return View::make('/case/complete', $result);
		} else {
			//Validateエラー時の処理
			$result['errors'] = $validator->messages();
			if (Session::get("id"))
				$result['title'] = 'Add new Case';
			else
				$result['title'] = 'Case Edit';
			$result['url'] = '/case/input';
			$result['project_list'] = Projects::getProjectList(Projects::AUTH_TYPE_CREATE, true);
			return View::make('/case/input', $result);
		}
	}

	/**
	 * ページ個別CSS設定
	 * @author stani
	 * @since 2014/12/04
	 */
	function cssSetting($mode = 'search') {
		$css = array();
	  	$css["ui-lightness/jquery-ui-1.10.4.custom.min.css"] = "css/ui-lightness/jquery-ui-1.10.4.custom.min.css";
		$css["page.css"] = "css/page.css";

		switch($mode) {
			case 'search':
				break;
			case 'detail':
			case 'edit':
				$css["color.css"] = "css/color.css";
				break;
		}
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
		$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';

		switch ($mode) {
			case 'search':
				$js['jquery.multiselect.min.js'] = 'js/jquery.multiselect.min.js';
				$js['jquery.formserializer.js'] = 'js/jquery.formserializer.js';
				$js['jquery.ruleseteditor.js'] = 'js/jquery.ruleseteditor.js';
				break;
			case 'detail':
			case 'edit':
			//	$js['img_edit.js'] = 'js/img_edit.js';
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
			$series_list[$value["seriesUID"]] = $value["seriesDescription"];
		}
		return $series_list;
	}

	/**
	 * ケースID作成(SHA256+uniqid)
	 * @return uniqidをSHA256でHash化した文字列(ケースID)
	 * @author stani
	 * @since 2014/12/15
	 */
	function createCaseID(){
		return hash_hmac('sha256', uniqid(), Config::get('const.hash_key'));
	}

	function getRevision($case_data) {
		//$max_revision = 0;
		foreach($case_data->revisions as $key => $value) {
			//keyがlatestのものはCloneなので対象外とする
			if ($key !== 'latest') {
				//Revision番号が大きい場合はセット
			//	if ($max_revision < $key)
			//		$max_revision = $key;

				//ラベル数を求める
				$label_cnt = 0;
				foreach ($value['series'] as $rec) {
					$label_cnt += count($rec['labels']);
				}

				//曜日を求める
				$w = self::getWeekDay(date('w', $value['date']->sec));

				//表示用にリスト作成
				$revision_list = array(
					'revisionNo'	=>	$key,
					'editDate'		=>	date('Y/m/d('.$w.')', $value['date']->sec),
					'editTime'		=>	date('H:i', $value['date']->sec),
					'seriesCount'	=>	count($value['series']),
					'labelCount'	=>	$label_cnt,
					'creator'		=>	$value['creator'],
					'memo'			=>	$value['memo']
				);
			}
		}
	}


	/**
	 * 患者ID重複チェック
	 * 重複がない場合は表示用のシリーズ一覧を格納する
	 * @param $list 患者ID重複対象のシリーズ一覧
	 * @param $series_list エラーがない場合の格納先シリーズ一覧
	 * @return $error_msg エラーメッセージ
	 * @author stani
	 * @since 2014/12/16
	 */
	function checkDuplicatePatientID($list, &$series_list = array()) {
		$error_msg = '';

		$patientID = $list[0]->patientID;
		foreach ($list as $rec) {
			if ($patientID != $rec->patientID) {
				$error_msg = '1ケースに登録できるシリーズは同一患者のみです。\n同一患者のシリーズを選択してください。';
				break;
			}
			$series_list[$rec->seriesUID] = $rec->seriesDescription;
		}
		return $error_msg;
	}
}
