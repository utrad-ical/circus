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
		//ログインチェック
		if (!Auth::user()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//ログインしているのでケース検索画面の表示処理を行う
		$result = array();
		$result["user_name"] = Auth::user()->userID;

		//プロジェクト情報取得
		//TODO::参照グループIDで絞り込み
		$projects = Cases::all();
		$result["project"] = $projects;
		$result["title"] = "Case Search";
		$result["url"] = "case/search";

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
				array("projectID", "caseID", "patientID", "patientName", "InspectionDate")
		);

		$where = array();
		//Where文作成
		//projectID プロジェクトID
		if ($inputs['projectID']) {
			//ケーステーブルのプロジェクトID
			$where[] = array('c.projectID', '=', $inputs['projectID']);
		}

		//caseID ケースID
		if ($inputs['caseID']) {
			//ケーステーブルのcaseID
			$where[] = array('c.caseID', '=', $inputs['caseID']);
		}

		//patientID 患者ID
		if ($inputs['patientID']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のpatientID
			$where[] = array('c.patientID', '=', $inputs['patientID']);
		}

		//patientName 患者名
		if ($inputs['patientName']) {
			//CaseテーブルのpatientInfoCacheオブジェクト内のptientName
			$where[] = array('c.patientName', 'like', '$'.$inputs['patientName'].'$');
		}

		//InspectionDate 検査日
		if ($inputs['InspectionDate']) {
			//どこのテーブル参照？
			//ここにSQL文
		}


		//本当は検索条件付加
		//検索結果を格納
		$case_list = Cases::find();

		$result = array();
		$result["case_list"] = $case_list;
		$result["title"] = "Case Search";
		$result["url"] = "case/search";

		return View::make('case/search', $result);
	}
}
