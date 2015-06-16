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
 * @property string creator Label creator Email
 */
class Label extends BaseModel {
	protected $connection = 'mongodb';

	const COLLECTION = 'Labels';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'labelID';

	const UPDATED_AT = null;

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
		'creator'		=>	'required|email',
		'createTime'	=>	'mongodate'
	);

	protected $uniqueFields = array(
		'labelID'
	);

}
