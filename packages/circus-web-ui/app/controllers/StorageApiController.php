<?php

use Illuminate\Support\MessageBag;

class StorageApiController extends ResourceApiBaseController
{
	protected $fields = array('storageID', 'type', 'path', 'active');
	protected $targetClass = 'Storage';
	protected $settable = ['active', 'type', 'path'];

	protected function beforeAssignFilter(array &$item, $isNew)
	{
		if ($isNew) $item['active'] = false;
	}


	protected function beforeUpdateFilter($model, $isNew)
	{
		if (!$isNew) {
			$storage = Storage::find($model->storageID);
			if (!$storage) throw new ErrorException('Storage not found');
			if ($storage->type !== $model->type) {
				$errors = new MessageBag(['type' => ['The storage type cannot be changed after creation.']]);
				throw new InvalidModelException($errors);
			}
		}
	}

	public function setActive($storageID)
	{
		$storage = Storage::findOrFail(intval($storageID));
		$id = $storage->storageID;
		DB::table(Storage::COLLECTION)->where(array('type' => $storage->type))->update(array('active' => false));
		DB::table(Storage::COLLECTION)->where(array('storageID' => $id))->update(array('active' => true));
		return $this->succeedResponse();
	}
}