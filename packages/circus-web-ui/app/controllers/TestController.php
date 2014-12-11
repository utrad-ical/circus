<?php
/**
 * テストデータ登録クラス
 * @author stani
 * @since 2014/12/11
 */
class TestController extends BaseController {
	/**
	 * テストデータ登録トップ画面
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndex() {
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "ダミーデータ登録";
		$result["url"] = "test";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.index', $result);
	}

	/**
	 * ケースダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexCase() {
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "Case Dummy Data Regist";
		$result["url"] = "/test/case";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.case', $result);
	}

	/**
	 * ケースダミーデータ登録(登録)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function registCase() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::only(
			array(
				"caseID", "incrementalID", "projectID", "caseDate",
				"patientID", "patientName", "age", "birthday", "sex"
			)
		);

		Log::debug("入力値(Case Dummy)");
		Log::debug($inputs);

		if (Cases::isValid()) {
			//Validate成功時の処理
			//エラーがないので登録する
			Cases::save();
			return Redirect::to('test.index', array("msg" => "ケースの登録が完了しました。"));
		} else {
			//Validateエラー時の処理
		}

		$result["title"] = "Case Dummy Data Regist";
		$result["url"] = "/test/case";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.case', $result);
	}

	/**
	 * シリーズダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexSeries() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "Series Dummy Data Regist";
		$result["url"] = "/test/series";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.series', $result);
	}

	/**
	 * シリーズダミーデータ登録(登録)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function registSeries() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::only(
			array(
				"studyUID", "seriesUID","storageID",
				"patientID", "patientName", "age",
				"birthday", "sex", "patientHeight", "patientWeight",
				"width", "height", "modality", "seriesDescription",
				"bodyPart", "images", "stationName", "modelName",
				"menufacturer", "parameters", "domain"
			)
		);

		Log::debug("入力値(Series Dummy)");
		Log::debug($inputs);

		if (Serieses::isValid()) {
			//Validate成功時の処理
			//エラーがないので登録する
			Serieses::save();
			return Redirect::to('test.index', array("msg" => "シリーズの登録が完了しました。"));
		} else {
			//Validateエラー時の処理
		}

		$result["title"] = "Series Dummy Data Regist";
		$result["url"] = "/test/series";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.series', $result);
	}

	/**
	 * プロジェクトダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexProject() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "Project Dummy Data Regist";
		$result["url"] = "/test/project";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.project', $result);
	}

	/**
	 * プロジェクトダミーデータ登録(登録)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function registProject() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::only(
			array(
				"projectID", "projectName",
				"createGroups", "viewGroups", "updateGroups", "reviwGroups", "deleteGroups"
			)
		);

		Log::debug("入力値(Project Dummy)");
		Log::debug($inputs);

		if (Serieses::isValid()) {
			//Validate成功時の処理
			//エラーがないので登録する
			Project::save();
			return Redirect::to('test.index', array("msg" => "プロジェクトの登録が完了しました。"));
		} else {
			//Validateエラー時の処理
		}

		$result["title"] = "Project Dummy Data Regist";
		$result["url"] = "/test/project";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.project', $result);
	}

	/**
	 * ユーザダミーデータ登録(初期表示)
	 * @author stani
	 * @since 2014/12/11
	 */
	public function getIndexUser() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		$result = array();
		$result["title"] = "User Dummy Data Regist";
		$result["url"] = "/test/user";
		$result["css"] = self::cssSetting();
		$result["js"] = self::jsSetting();

		return View::make('test.user', $result);
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
	//function jsSetting($mode = 'search') {
	function jsSetting() {
		$js = array();
		$js["jquery-ui.min.js"] = "js/jquery-ui.min.js";

		return $js;
	}
}
