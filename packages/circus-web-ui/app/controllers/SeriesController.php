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

		//入力値取得
		$inputs = Input::only(
			array(
				"seriesUID", "seriesName", "patientID",
				"patientName", "minAge", "maxAge",
				"sex", "sort", "disp",
				"btnReset", "btnSearch", "btnBack"
			)
		);

		//Resetボタン押下時の挙動
		if ($inputs["btnReset"]) {
//			$inputs = array();
			Session::forget('series.search');
			$search_flg = false;
		} else if ($inputs["btnSearch"]) {
			Session::put("series.search", $inputs);
		}

		//検索
		if ($search_flg) {
			$search_data = Session::get("series.search");
			//検索条件生成＆データ取得
			//取得カラムの設定
			$select_col = array(
				"seriesUID",
				"patientInfo.patientID", "patientInfo.patientName",
				"patientInfo.sex", "patientInfo.birthday"
			);

			Log::debug("検索条件");
			Log::debug($search_data);
			Log::debug("入力値");
			Log::debug($inputs);

			//シリーズ一覧取得
			$order = isset($search_data["sort"]) ? $search_data["sort"] : "updateTime";
			$series_list = Serieses::addWhere($search_data)
							->orderby($order, 'desc')
							->get($select_col);
			$query_log = DB::getQueryLog();

			//表示用に整形
			$list = array();
			foreach($series_list as $rec) {
				//患者情報
				$patient = $rec->patientInfo;

				//表示用に整形する
				$list[] = array(
					"seriesID"			=>	$rec->seriesUID,
					"seriesName"		=>	"Series AAA",
					"patientID"			=>	$patient["patientID"],
					"patientName" 		=>	$patient["patientName"],
					"patientBirthday"	=>	$patient["birthday"],
					"patientSex"		=>	$patient["sex"]
				);
			}
			$result["list"] = $list;
			//ページャーの設定
			$case_pager = Paginator::make(
				$list,
				count($list),
				isset($inputs["disp"]) ? $inputs["disp"] : Config::get('const.page_display')
			);
			$result["list_pager"] = $case_pager;
		}

		$result["title"] = "Series Search";
		$result["url"] = "series/search";
		$result["search_flg"] = $search_flg;
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();
		$result["inputs"] = $inputs;

		return View::make('series/search', $result);
	}

	/**
	 * シリーズ詳細ページ
	 * @author stani
	 * @since 2014/12/11
	 */
	function detail() {
		$result = array();
		$result["title"] = "Series Detail";
		$result["url"] = "series/detail";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('series/detail', $result);
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
		return $js;
	}
}
