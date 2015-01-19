<?php


use Jenssegers\Mongodb\Model as Eloquent;

/**
 * Label table manipulation class
 */
class Label extends Eloquent {
	protected $connection = 'mongodb';
	protected $collection = 'Labels';

	protected $primaryKey = 'labelID';

	/**
	 * Search conditions Building
	 * @param $query Query Object
	 * @param $input Input value
	 * @return Query Object
	 */
	public function scopeAddWhere($query, $input) {
		//labelID
		if (isset($input['labelID']) && $input['labelID']) {
			//Of the Labels table labelID
			$labels = array();
			foreach ($input['labelID'] as $label){
				$labels[] = intval($label);
			}
			$query->whereIn('labelID', $label);
		}

		//storageID
		if (isset($inputs['storageID']) && $input['storageID']) {
			//Of the Labels table storageID
			$query->where('storageID', '=', intval($input['storageID']));
		}
		return $query;
	}

	/**
	 * Validate Rules
	 */
	private $rules = array(
		'labelID'	=>	'required',
		'storageID'	=>	'required|integer',
		'x'			=>	'required|integer',
		'y'			=>	'required|integer',
		'z'			=>	'required|integer',
		'w'			=>	'integer',
		'h'			=>	'integer',
		'd'			=>	'integer',
		'number'	=>	'integer',
		'creator'	=>	'required',
		'date'		=>	'required'
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
}
