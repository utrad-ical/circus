<?php

class ApiBaseController extends BaseController
{
	protected $targetClass = '';
	protected $fields = '';
	protected $settable = [];

	public function __construct() {
		// Anyone who wants to access this API must be property authenticated
		$this->beforeFilter('auth');
	}

	public function index()
	{
		$class = $this->targetClass;
		$data = $class::all($this->fields)->toArray();
		foreach ($data as &$item) {
			$this->showFilter($item);
		}
		return Response::json($data);
	}

	/**
	 * Does manipulation to the resource data before sending it as JSON.
	 * @param $item array An array representing one resource item.
	 */
	protected function showFilter(array &$item) {
		unset($item['_id']); // We don't need Mongo's internal _id
	}

	protected function succeedResponse() {
		return Response::json(['status' => 'OK']);
	}

	protected function errorResponse($message) {
		return Response::json(['status' => 'NG', 'errors' => $message], 400); // Bad Request
	}

	/**
	 * Returns one resource item.
	 * @param $id int The resource ID.
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function show($id)
	{
		$class = $this->targetClass;
		$item = $class::findOrFail(intval($id), $this->fields)->toArray();
		$this->showFilter($item);
		return Response::json($item);
	}

	/**
	 * Called when PUT/POST method is invoked, before mass-assigning the posted data to the model.
	 * Subclasses can override this method and tweak the posted contents.
	 * @param array $item The posted contents.
	 */
	protected function beforeAssignFilter(array &$item, $isNew)
	{
		return;
	}

	/**
	 * Called when PUT/POST methods is invoked, before validating the model.
	 * @param $model
	 */
	protected function beforeUpdateFilter($model, $isNew)
	{
		return;
	}

	protected function bulkAssignPostedDataToModel($model, $data, $isNew)
	{
		$this->beforeAssignFilter($data, $isNew);
		foreach ($data as $key => $value) {
			if (array_search($key, $this->settable) === false) {
				App::abort(400, "Unknown field $key passed");
			}
			$model->$key = $value;
		}
		$this->beforeUpdateFilter($model, $isNew);
		return $this;
	}

	protected function validateAndSave($item)
	{
		$errors = null;
		if ($item->selfValidationFails($errors)) {
			return $this->errorResponse($errors);
		} else {
			$item->save();
			return $this->succeedResponse();
		}
	}

	/**
	 * Saves new model.
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function store()
	{
		if (!Request::isJson()) App::abort(400);
		$newItem = App::make($this->targetClass);
		$newID = Seq::getIncrementSeq($this->targetClass);
		$pk = $newItem->getPrimaryKey();
		$newItem->$pk = $newID;
		$data = Input::all();
		try {
			return $this->bulkAssignPostedDataToModel($newItem, $data, true)
				->validateAndSave($newItem);
		} catch (InvalidModelException $e) {
			return  $this->errorResponse($e->getErrors());
		}
	}

	/**
	 * Updates current model.
	 * @param $id string ID of the edit target.
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function update($id)
	{
		if (!Request::isJson()) App::abort(400);
		$class = $this->targetClass;
		$item = $class::findOrFail(intval($id));
		$data = Input::all();
		try {
			return $this->bulkAssignPostedDataToModel($item, $data, false)
				->validateAndSave($item);
		} catch (InvalidModelException $e) {
			return  $this->errorResponse($e->getErrors());
		}
	}

	protected function checkDeletable(BaseModel $model, &$message)
	{
		$message = 'This item cannot be deleted.';
		return false;
	}

	/**
	 * Deletes the specified model.
	 * @param $id string ID of the deletion target.
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function delete($id)
	{
		$class = $this->targetClass;
		$item = $class::findOrFail(intval($id));
		$message = '';
		if ($this->checkDeleteable($item, $message) === true) {
			$item->delete();
			return $this->succeedResponse();
		} else {
			return  $this->errorResponse($message);
		}
	}

	public function __call($method, $parameters)
	{
		return Response::json('Invalid', 404);
	}
}