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
	public static function getProjectList($auth_gp, $make_combo = false){
		$project_list = self::whereIn($auth_gp, Auth::user()->groups)
							->get(array('projectID', 'projectName'));
		$projects = array();
		//コンボ生成用
		if ($project_list) {
			foreach ($project_list as $project) {
				if ($make_combo)
					$projects[$project->projectID] = $project->projectName;
				else
					$projects[] = $project->projectID;
			}
		}
		return $projects;
	}

	/**
	 * プロジェクト名を取得する
	 * @param $projectID プロジェクトID
	 * @return プロジェクト名
	 * @author stani
	 * @since 2014/12/08
	 */
	public static function getProjectName($projectID) {
		$project = self::whereRaw('projectID', '=', $projectID)->get("projectName");
		return $project;
	}

	/**
	 * Validationルール
	 * @var rules Validateルール配列
	 * @author stani
	 * @since 2014/12/12
	 */
	public static $rules = array(
		'projectID'		=>	'required|integer',
		'projectName'	=>	'required'
	);

	/**
	 * isValidが使えるようになったらこのメソッドは消す
	 * Validateルールを取得する
	 * @return Validateルール配列
	 * @author stani
	 * @since 2014/12/12
	 */
	public static function getValidateRules() {
		return array(
			'projectID'		=>	'required|integer',
			'projectName'	=>	'required'
		);
	}

}
