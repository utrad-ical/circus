<?php

class UserPreferenceApiController extends BaseController
{
	public function index() {
		$user = Auth::user();
		$preferences = $user->preferences;
		return Response::json($preferences);
	}

	public function store() {
		$input = Input::all();
		$user = Auth::user();

		$preferences = $user->preferences;

		foreach($input as $key => $val) {
			if ($key === 'caseSearchPresets' || $key === 'seriesSearchPresets') {
				$presets = isset($preferences[$key]) ? $preferences[$key] : array();
				$presets[] = $val;
				$preferences[$key] = $presets;
			} else {
				$preferences[$key] = $val;
			}
		}
		$user->preferences = $preferences;

		if ($user->selfValidationFails($messages)) {
			return Response::json(['status' => 'NG', 'errors' => $messages], 400);
		}
		$user->save();
		return Response::json(['status' => 'OK']);
	}
}