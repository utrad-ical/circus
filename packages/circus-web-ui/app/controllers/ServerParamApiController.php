<?php

/**
 * Manages server params.
 */
class ServerParamApiController extends ApiBaseController
{
	public function get()
	{
		$entries = ServerParam::all();
		$data = [];
		foreach ($entries as $entry) $data[$entry->key] = $entry->value;
		return Response::json($data);
	}

	public function post()
	{
		$entries = Input::all();
		$entries = $this->validate($entries);
		foreach ($entries as $key => $value) {
			ServerParam::setVal($key, $value);
		}
		return Response::json('OK');
	}

	protected function validate($entries)
	{
		$entries = array_only($entries, ['domains']);
		return $entries;
	}
}
