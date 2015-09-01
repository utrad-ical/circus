<?php

/**
 * Model class for labels.
 * @property string labelID Label ID
 * @property number storageID ID indicating the storage location of the data
 * @property number x X-axis coordinate voxel begins
 * @property number y Y-axis coordinate voxel begins
 * @property number z Z-axis coordinate voxel begins
 * @property number w Volume width (size along the x-axis)
 * @property number h Volume height (size along the y-axis)
 * @property number d Volume depth (size along the z-axis)
 * @property string creator Label creator Email
 */
class Label extends BaseModel {
	protected $connection = 'mongodb';

	const COLLECTION = 'Labels';
	protected $collection = self::COLLECTION;

	protected $primaryKey = 'labelID';

	const UPDATED_AT = null;

	public function storage()
	{
		return $this->belongsTo('Storage', 'storageID');
	}

	public function labelPath()
	{
		return $this->storage->path .
			DIRECTORY_SEPARATOR . substr($this->labelID, 0, 4) .
			DIRECTORY_SEPARATOR . substr($this->labelID, 4, 2) .
			DIRECTORY_SEPARATOR . $this->labelID . '.gz';
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
		'creator'		=>	'required|strict_string',
		'createTime'	=>	'mongodate'
	);

	protected $uniqueFields = array(
		'labelID'
	);

}
