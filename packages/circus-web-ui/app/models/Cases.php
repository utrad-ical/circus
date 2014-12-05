<?php


use Jenssegers\Mongodb\Model as Eloquent;

class Cases extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Case';

	//プロジェクト
	function project() {
		return $this->belongs_to('Project', 'projectID');
	}

	protected $primaryKey = 'caseID';

	protected static $_has_many = array(
		'project' => array(
			'key_form' => 'case_id',
			'model_to' => 'Project',
			'key_to' => 'projectID'
		),
	);

	/**
	 * 検索条件構築(And条件)
	 * @param $query Queryオブジェクト
	 * @param $input 入力値
	 * @return Queryオブジェクト
	 * @author stani
	 * @since 2014/12/05
	 */
	public function scopeAddWhere($query, $input) {
		foreach ($input as $key => $value) {
			echo "Value::".$value;
			if ($value) {
				echo "Query::";
				var_dump($key."::".$value);
				$query->where($key, "=", $value);
			}
		}
		return $query;
	}
}
