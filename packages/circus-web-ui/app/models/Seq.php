<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Seqs table manipulation class
 */
class Seq extends Eloquent {
	protected $connection = 'mongodb';

	const COLLECTION = 'Seqs';
	protected $collection = self::COLLECTION;

	protected $primaryKey = '_id';
	public $timestamps = false;

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 */
	public function scopeAddWhere($query, $input) {
		//Table name _id
		if (isset($inputs['_id']) && $input['_id']) {
			$query->where('_id', '=', $input['_id']);
		}
		return $query;
	}

	/**
	 * Validate Rules
	 */
	private $rules = array(
		'_id'		=>	'required',
		'seq'		=>	'required|integer'
	);

	/**
	 * Validate Check
	 * @param $data Validate checked
	 * @return Error content
	 */
	public function validate($data) {
		$validator = Validator::make($data, $this->rules);

		if ($validator->fails()) {
			return $validator->messages();
		}
		return;
	}

	/**
	 * I get the sequence number of the specified table
	 * @param String $tbl Table name
	 */
	public static function getIncrementSeq($tbl){
		$obj = self::find($tbl);
		$obj->seq = $obj->seq+1;
		$obj->save();

		$seq = $obj->seq;
		return $seq;
	}
}
