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
		$entries = array_only($entries, ['domains', 'defaultDomain']);

		$rules = [
			'domains' => 'array_of_domains|required',
			'defaultDomain' => 'required'
		];
		$errmes = [
			'array_of_domains' => 'Invalid domain list.'
		];

		$validator = Validator::make($entries, $rules, $errmes);
		if ($validator->fails()) {
			throw new InvalidModelException($validator->messages());
		}
		return $entries;
	}
}

Validator::extend('array_of_domains', function ($attribute, $value, $parameters) {
	if (!is_array($value)) return false;
	if (count($value) < 1) return false;
	foreach ($value as $domain) {
		if (!is_string($domain)) return false;
		if (!preg_match('/^[a-zA-Z0-9\-\.]+$/', $domain)) return false;
	}
	return true;
});
