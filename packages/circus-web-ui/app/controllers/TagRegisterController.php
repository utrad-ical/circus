<?php
/**
 * タグ登録クラス
 */
class TagRegisterController extends BaseController {
	function save_tags() {
		try {
			$inputs = Input::all();
			$errors = $this->validateSaveTags($inputs);

			if (count($errors) > 0)
				throw new Exception(implode("\n", $errors));

			if (is_array($inputs['caseID'])) {
				foreach ($inputs['caseID'] as $caseID) {
					$this->saveTags($caseID, $inputs['tags']);
				}
			} else {
				$this->saveTags($inputs['caseID'], $inputs['tags']);
			}
			return $this->outputJson(true, 'Success saved tag.');
		} catch (InvalidModelException $e) {
			Log::debug('InvalidModelException Error');
			Log::error($e);
			return $this->outputJson(false, $e->getErrors());
		} catch (Exception $e){
			Log::debug('Exception Error');
			Log::error($e);
			return $this->outputJson(false, $e->getMessage());
		}
	}

	private function saveTags($caseID, $tags)
	{
		$case_obj = ClinicalCase::find($caseID);
		$case_obj->tags = json_decode($tags, true);
		$case_obj->save();
	}

	/**
	 * 登録結果をJson出力する
	 * @param Boolean $result 登録結果
	 * @param String $msg メッセージ
	 */
	function outputJson($result, $msg) {
		$data = array('result' => $result, 'message' => $msg);
		return Response::json($data);
	}

	/**
	 * Tags stored data simple Validate
	 * @param $data Tags stored data
	 */
	function validateSaveTags($data) {
		$error = array();
		//Case ID check
		if (!$data['caseID']) {
			$error[] = 'Please set the case ID.';
		} else if (!array_key_exists('tags', $data)) {
			$error[] = 'Please set the tags. ';
		} else {
			if (is_array($data['caseID'])) {
				foreach ($data['caseID'] as $caseID) {
					$this->validateCase($caseID, $data['tags'], $error);
				}
			} else {
				$this->validateCase($data['caseID'], $data['tags'], $error);
			}

		}
		return $error;
	}

	private function validateCase($caseID, $tags, &$error)
	{
		$tagList = json_decode($tags, true);
		$case_data = ClinicalCase::find($caseID);
		if (!$case_data)
		$error[] = $caseID.'is the case ID that does not exist.';

		$project_tags = $case_data->project->tags;
		foreach ($tagList as $tag) {
			if (array_key_exists($tag, $project_tags) === false) {
				$error[] = 'invalid tags';
			}
		}
	}
}
