<?php
/**
 * シリーズ検索画面の操作を行うクラス
 * @author stani
 * @since 2014/12/09
 */
class SeriesController extends BaseController {
	/**
	 * シリーズ検索画面
	 * @author stani
	 * @since 2014/12/09
	 */
	public function getIndex() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//検索条件初期化
		Session::forget('series.search');

		//ログインしているのでシリーズ検索画面の表示処理を行う
		$result = array();
		$result["title"] = "Series Search";
		$result["url"] = "series/search";
		$result["search_flg"] = false;
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();
		$result["inputs"] = array("sex" => "all");

		return View::make('series.search', $result);
	}

	/**
	 * シリーズ検索結果
	 * @author stani
	 * @since 2014/12/09
	 */
	public function search() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期化
		$search_flg = true;
		$result = array();
		//Cookie初期化
		$series_cookie = Cookie::make('seriesCookie2', '', time() - 3600);
		$series_cookie2 = Cookie::queue('seriesCookie3', '', time() - 3600);

		//入力値取得
		$inputs = Input::all();

		//Resetor初期表示ボタン押下時
		if (array_key_exists ('btnReset', $inputs) !== FALSE || !$inputs) {
			$search_flg = false;
			Session::forget('series.search');
			$result["inputs"] = array("sex" => "all");
		//検索ボタン押下時
		} else if (array_key_exists('btnSearch', $inputs) !== FALSE) {
			if (array_key_exists ('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists ('sort', $inputs) === FALSE) $inputs['sort'] = 'updateTime';
			Session::put('series.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== FALSE) {
			$tmp = Session::get('series.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put('series.search', $tmp);
		}

		//検索
		if ($search_flg) {
			$search_data = Session::get('series.search');
			//検索条件生成＆データ取得
			//取得カラムの設定
			$select_col = array(
				'seriesUID', 'seriesDescription',
				'patientInfo.patientID', 'patientInfo.patientName',
				'patientInfo.sex', 'patientInfo.birthday'
			);

			//総件数取得
			$series_count = Serieses::addWhere($search_data)
									->count();

			//paginate(10)という風にpaginateを使う場合はget(select句)が指定できない
			$series_list = Serieses::addWhere($search_data)
									->orderby($search_data['sort'], 'desc')
									->addLimit($search_data)
									->get($select_col);
			$query_log = DB::getQueryLog();

			//表示用に整形
			$list = array();
			foreach($series_list as $rec) {
				//患者情報
				$patient = $rec->patientInfo;

				//表示用に整形する
				$list[] = array(
					'seriesID'			=>	$rec->seriesUID,
					'seriesDescription'	=>	$rec->seriesDescription,
					'patientID'			=>	$patient['patientID'],
					'patientName' 		=>	$patient['patientName'],
					'patientBirthday'	=>	$patient['birthday'],
					'patientSex'		=>	self::getSex($patient['sex'])
				);
			}
			$result["list"] = $list;
			//ページャーの設定
			$case_pager = Paginator::make(
				$list,
				$series_count,
				$search_data['disp']
			);
			$result['list_pager'] = $case_pager;
			$result['inputs'] = $search_data;
		}

		$result['title'] = 'Series Search';
		$result['url'] = 'series/search';
		$result['search_flg'] = $search_flg;
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('series/search', $result)
					->withCookie($series_cookie2)
					->withCookie($series_cookie);
	}

	/**
	 * シリーズ詳細ページ
	 * @author stani
	 * @since 2014/12/11
	 */
	function detail() {
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

		if (!$inputs["seriesUID"]) {
			$error_msg = "シリーズIDを指定してください。";
		}

		if (!$error_msg) {
			//存在するシリーズIDかチェック
			$series_data = Serieses::find($inputs['seriesUID']);
			if (!$series_data) {
				$error_msg = "存在しないシリーズIDです。";
			}
		}

		//エラーメッセージがない場合はケース詳細情報を表示する
		if (!$error_msg) {
			//シリーズ情報を表示用に整形

			$series_detail = array(
				"seriesUID"			=>	$series_data->seriesUID,
				"patientID"			=>	$series_data->patientInfo["patientID"],
				"patientName"		=>	$series_data->patientInfo["patientName"],
				"patientBirthday"	=>	$series_data->patientInfo["birthday"],
				"patientSex"		=>	$series_data->patientInfo["sex"],
				"LastUpdate"		=>	date('Y/m/d h:i', $series_data->updateTime->sec),
				"creator"			=>	'Yukihiro Nomura'
			);
			$result["series_detail"] = $series_detail;
		} else {
			$result["error_msg"] = $error_msg;
		}
		$result["title"] = "Series Detail";
		$result["url"] = "series/detail";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();
		return View::make("/series/detail", $result);
	}

	/**
	 * ページ個別CSS設定
	 * @author stani
	 * @since 2014/12/04
	 */
	function cssSetting() {
		$css = array();
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
		$js["jquery.cookie.js"] = "js/jquery.cookie.js";
		return $js;
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
}
