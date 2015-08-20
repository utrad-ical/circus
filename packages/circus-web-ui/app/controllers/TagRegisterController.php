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

			$case_obj = ClinicalCase::find($inputs['caseID']);
			$case_obj->tags = json_decode($inputs['tags'], true);
			$case_obj->save();
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
			$error_msg[] = 'Please set the case ID.';
		} else if (array_key_exists('tags', $data)) {
			$error_msg[] = 'Please set the tags. ';
		} else {
			//Case presence check
			$case_data = ClinicalCase::find($data['caseID']);
			if (!$case_data)
				$error_msg[] = $data['caseID'].'is the case ID that does not exist.';

			$project_tags = $case_data->project->tags;
			foreach ($data['tags'] as $tag) {
				if (array_key_exists($tag, $project_tags) === false) {
					$error_msg[] = 'invalid tags';
				}
			}

		}
		return $error;
	}
}
