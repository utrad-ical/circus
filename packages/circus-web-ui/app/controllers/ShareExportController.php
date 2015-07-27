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
			if ($inputs['personal'] == 1)
				$cmd_str .= ' --without-personal';

			//delete trash files
			//TODO::要保存場所の確認。キャッシュ配下だと他コマンド実行時に削除視されてしまうため
			//CommonHelper::deleteOlderTemporaryFiles(storage_path('cache'), true, '-2 day');

			$task = Task::startNewTask("case:export-volume " .$cmd_str);
			if (!$task) {
				throw new Exception('Failed to invoke export process.');
			}

			//download zip file
			$zip_file_name = 'data.tar.gz';
			$zip_file_path = $tmp_dir_path.'/'.$zip_file_name;
			Log::debug('圧縮期待ファイル名::');
			Log::debug($zip_file_path);

			if (!file_exists($zip_file_path))
				throw new Exception('failed create tar.gz file .');

			//ダウンロードに必要な情報の設定
			$res = array(
				'file_name' => $zip_file_name,
				'dir_name' => $tmp_dir
			);

			return Response::json(array(
				'result' => true,
				'taskID' => $task->taskID,
				'response' => $res
			));
		} catch (Exception $e) {
			Log::error($e);

			/*
			TODO::圧縮成功してからこのコメントアウト解除する
			if (isset($tmp_dir_path))
				File::deleteDirectory($tmp_dir_path);
				*/
			return Response::json(
				array('result' => false, 'errorMessage' => $e->getMessage()),
				400
			);
		}
	}

	private function validate($data) {
		//Export対象のケースチェック
		$cases = $_COOKIE['exportCookie'];
		if (!$cases)
			throw new Exception('ケースを1つ以上選択してください。');

		$caseIds = explode('_', $cases);
		foreach ($caseIds as $caseId) {
			$case = ClinicalCase::find($caseId);
			if (!$case)
				throw new Exception('ケースID['.$caseId.']は存在しません。');
		}

		//個人情報有無
		if ($data['personal'] != 0 && $data['personal'] != 1)
			throw new Exception('個人情報有無を選択してください。');

		//TODO::タグのValidate
		if ($data['tags']) {
			//TODO::想定内のタグかどうかのチェック
		}
	}
}
