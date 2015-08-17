<?php
/**
 * Export機能
 */
class ShareExportController extends BaseController {
	/**
	 * Share Export
	 */
	public function export() {
		$result = array();

		//POST data acquisition
		$inputs = Input::all();
		try {
			//validate check
			$this->validate($inputs);

			//create temporary folder
			$tmp_dir = Str::random(32);
			$tmp_dir_path = storage_path('cache').'/'.$tmp_dir;
			if (!mkdir($tmp_dir_path))
				throw new Exception('Creating a temporary folder failed');

			//command execution
			$caseIds = str_replace('_', ',', $_COOKIE['exportCookie']);
			$cmd_str = ' '.$caseIds. ' '.$tmp_dir_path;
			if ($inputs['personal'] == 0)
				$cmd_str .= ' --without-personal';
			//タグの設定
			if ($inputs['tags']) {
				$tags = implode(',', json_decode($inputs['tags'], true));
				$cmd_str .= ' --tag='.$tags;
			}

			//Export用で2日以上経過したものを削除する
			CommonHelper::deleteOlderTemporaryFiles(storage_path('transfer'), true, '-2 day');

			$task = Task::startNewTask("case:export-volume " .$cmd_str);
			if (!$task) {
				throw new Exception('Failed to invoke export process.');
			}

			//共有用にCache配下からstorage/transferに移動する
			if (!is_dir(storage_path('transfer'))) {
				mkdir(storage_path('transfer'), 0777, true); // make directory recursively
			}
			$res = array(
				'file_name' => 'data.tgz',
				'dir_name'  => $tmp_dir_path.'/data.tgz'
			);

			return Response::json(array(
				'result' => true,
				'taskID' => $task->taskID,
				'response' => $res
			));
		} catch (Exception $e) {
			Log::error($e);
			return Response::json(
				array('result' => false, 'errorMessage' => $e->getMessage()),
				400
			);
		}
	}

	private function validate($data) {
		//Export対象のケースチェック
		if ($data['export_type'] === 'btnExportSelect') {
			$cases = $_COOKIE['exportCookie'];
			if (!$cases)
				throw new Exception('ケースを1つ以上選択してください。');

			$caseIds = explode('_', $cases);
		} else {
			//全件
			$search_data = Session::get('share.search');

			$result = ClinicalCase::searchCase($search_data);
			$caseIds = array();
			if (!$result) {
				foreach ($result as $rec) {
					$caseIds[] = $rec->caseID;
				}
			}
		}

		$projectId = "";
		foreach ($caseIds as $caseId) {
			$case = ClinicalCase::find($caseId);
			if (!$case)
				throw new Exception('ケースID['.$caseId.']は存在しません。');
			//異なるプロジェクトが混じっていないかチェックする

			if (!$projectId)
				$projectId = $case->projectID;

			if ($projectId !== $case->projectID)
				throw new Exception('Detail Search selection of the project can only when one .');
		}

		//個人情報有無
		if ($data['personal'] != 0 && $data['personal'] != 1)
			throw new Exception('個人情報有無を選択してください。');

		//タグ
		if ($data['tags']) {
			$tags = json_decode($data['tags'], true);

			$project = Project::find($projectId);
			foreach ($tags as $tag) {
				if (!isset($project->tags[intval($tag)])) {
					throw new Exception('存在しないタグです。');
				}
			}
		}
	}
}
