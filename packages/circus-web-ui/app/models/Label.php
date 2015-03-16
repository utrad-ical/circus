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

	const UPDATED_AT = null;

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
		'labelID'		=>	'required',
		'storageID'		=>	'required|strict_integer',
		'x'				=>	'required|strict_integer',
		'y'				=>	'required|strict_integer',
		'z'				=>	'required|strict_integer',
		'w'				=>	'required|strict_integer',
		'h'				=>	'required|strict_integer',
		'd'				=>	'required|strict_integer',
		'creator'		=>	'required|is_user',
		'createTime'	=>	'mongodate'
	);

	protected $uniqueFields = array(
		'labelID'
	);

	protected $messages = array(
		'storageID.strict_integer' => 'Please be storageID is set in numeric type .',
		'x.strict_integer' => 'Please be x is set in numeric type .',
		'y.strict_integer' => 'Please be y is set in numeric type .',
		'z.strict_integer' => 'Please be z is set in numeric type .',
		'w.strict_integer' => 'Please be w is set in numeric type .',
		'h.strict_integer' => 'Please be h is set in numeric type .',
		'd.strict_integer' => 'Please be d is set in numeric type .',
		'creator.is_user' => 'Invalid creator',
		'createTime.mongodate' => 'Please be createTime is set in mongodate type .'
	);

}
