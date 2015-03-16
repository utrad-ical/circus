<?php

/**
 * Model class for seqs.
 * @property string _id Table Name
 * @property number seq Sequence number
 */
class Seq extends BaseModel {
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
	protected $rules = array(
		'_id'		=>	'required|strict_string',
		'seq'		=>	'required|strict_integer'
	);

	protected $messages = array(
		'_id.strict_string' => 'Please be _id is set in string type .',
		'seq.strict_integer' => 'Please be seq is set in numeric type . '
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
	 * Generate new sequence number
	 * @param string $sequence_id Sequence ID
	 */
	public static function getIncrementSeq($sequence_id){
		if ($obj = self::find($sequence_id)) {
			$obj->seq += 1;
			$obj->save();
			return $obj->seq;
		} else {
			$new_seq = App::make('Seq');
			$new_seq->_id = $sequence_id;
			$new_seq->seq = 1;
			$new_seq->save();
			return 1;
		}
	}
}
