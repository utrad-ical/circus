<?php

/**
 * Model class for labels.
 * @property string labelID Label ID
 * @property number storageID ID indicating the storage location of the data
 * @property number x X -axis coordinate voxcel begins
 * @property number y Y -axis coordinate voxcel begins
 * @property number z Z -axis coordinate voxcel begins
 * @property number w The magnitude of the width of Voume ( area occupied by the Voxel)
 * @property number h Height of the size of the Voume ( area occupied by the Voxel)
 * @property number d The magnitude of the depth of Voume ( area occupied by the Voxel)
 * @property number creator Label creator ID
 */
class Label extends BaseModel {
	protected $connection = 'mongodb';

	const COLLECTION = 'Labels';
	protected $collection = self::COLLECTION;

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
	protected $rules = array(
		'labelID'		=>	'required|unique:Labels,labelID',
		'storageID'		=>	'required|integer',
		'x'				=>	'required|integer',
		'y'				=>	'required|integer',
		'z'				=>	'required|integer',
		'w'				=>	'required|integer',
		'h'				=>	'required|integer',
		'd'				=>	'required|integer',
		'creator'		=>	'required',
		'date'			=>	'required',
		'createTime'	=>	'mongodate',
		'updateTime'	=>	'mongodate'
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
