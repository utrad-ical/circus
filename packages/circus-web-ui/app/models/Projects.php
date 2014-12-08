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

	/**
	 * ログインユーザが閲覧可能なプロジェクト一覧を取得する
	 * @return ログインユーザが閲覧可能なプロジェクト一覧
	 * @author stani
	 * @since 2014/12/08
	 */
	public static function getProjectList(){
		$project_list = self::whereIn('viewGroups', Auth::user()->groups)->get();

		$projects = array();
		if ($project_list) {
			foreach ($project_list as $project) {
				$projects[$project->projectID] = $project->projectName;
			}
		}
		return $projects;
	}

}
