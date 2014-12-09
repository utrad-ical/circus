<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * プロジェクトテーブルモデル
 * @author stani
 * @since 2014/12/08
 */
class Projects extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Project';

	//権限定数
	const AUTH_TYPE_CREATE = 'createGroups';	//ケース作成権限
	const AUTH_TYPE_VIEW = 'viewGroups';		//ケース閲覧権限
	const AUTH_TYPE_UPDATE = 'updateGroups';	//ケース更新権限
	const AUTH_TYPE_REVIEW = 'reviewGroups';	//ケースレビュー権限
	const AUTH_TYPE_DELETE = 'deleteGroups';	//ケース削除権限

	/**
	 * ログインユーザが操作可能なプロジェクト一覧を取得する
	 * @return ログインユーザが閲覧可能なプロジェクト一覧
	 * @param $auth_gp 権限タイプ
	 * @param $make_combo コンボ要素生成フラグ
	 * @author stani
	 * @since 2014/12/08
	 */
	//public static function getProjectList($auth_gp = 'viewGroups', $make_combo = true){
	public static function getProjectList($auth_gp, $make_combo = false){
		//$project_list = self::whereIn('viewGroups', Auth::user()->groups)->get();
		$project_list = self::whereIn($auth_gp, Auth::user()->groups)
							->get(array('projectID', 'projectName'));
		if (!$make_combo) return $project_list;

		//コンボ生成用
		$projects = array();
		if ($project_list) {
			foreach ($project_list as $project) {
				$projects[$project->projectID] = $project->projectName;
			}
		}
		return $projects;
	}

	public static function getProjectName($projectID) {
		$project = self::whereRaw("projectID", "=", $projectID)->get("projectName");

		return $project;
	}

}
