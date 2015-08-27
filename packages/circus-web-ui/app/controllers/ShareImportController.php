<?php

/**
 * Import feature
 */
class ShareImportController extends BaseController
{
	/**
	 * @var integer DATA_TYPE_LOCAL Import data type:local
	 */
	const DATA_TYPE_LOCAL = 'local';
	/**
	 * @var integer DATA_TYPE_URL Import data type:url
	 */
	const DATA_TYPE_URL = 'url';

	/**
	 * Share Import
	 */
	public function import()
	{
		$result = array();

		$default_domain = ServerParam::getVal('defaultDomain');
		$domain_list = ServerParam::getDomainList();
		return View::make('share.import')
			->with('default_domain', $default_domain)
			->with('domains', $domain_list)
			->with('tag_list', array());
	}

	/**
	 * Import Register
	 */
	public function register()
	{
		$inputs = Input::all();
		$inputs['import_file'] = Input::file('import_file');

		try {
			$this->validate($inputs);

			//Import Type
			$cmd_str = ' '.$inputs['import_type'];

			//Import Path
			if ($inputs['import_type'] === self::DATA_TYPE_LOCAL) {
				$tmpDir = Str::random(32);
				$tmpPath = storage_path('cache').'/'.$tmpDir;
				mkdir($tmpPath, 0777, true);
				$inputs['import_file']->move($tmpPath, $inputs['import_file']->getClientOriginalName());
				$cmd_str .= ' '.$tmpPath.'/'.$inputs['import_file']->getClientOriginalName();
			} else if ($inputs['import_type'] === self::DATA_TYPE_URL) {
				$cmd_str .= ' '.$inputs['import_url'];
			}

			//PersonalInfo Option
			if ($inputs['personal'] == 0)
				$cmd_str .= ' --without-personal';

			//Domain option
			if ($inputs['domain'])
				$cmd_str .= ' --domain=' . $inputs['domain'];

			//Password option
			if ($inputs['tgz_pass'])
				$cmd_str .= ' --password=' . $inputs['tgz_pass'];

			//delete trash files
			CommonHelper::deleteOlderTemporaryFiles(storage_path('cache'), true, '-1 day');

			$task = Task::startNewTask("case:import-volume " . $cmd_str);
			if (!$task) {
				throw new Exception('Failed to invoke export process.');
			}
			return Response::json(array(
					'result' => true,
					'taskID' => $task->taskID));
		} catch (Exception $e) {
			Log::error($e);
			return Response::json(
				array('result' => false, 'errorMessage' => $e->getMessage()),
				400
			);
		}
	}

	public function addTag()
	{

		$inputs = Input::all();
		//TODO::タグ付与処理

		//Tag Option
		/*
		$tags = implode(',', json_decode($inputs['tags'], true));
		if ($tags) {
			$cmd_str .= ' --tag=' . $tags;
		}
		*/
	}

	public function validate($params)
	{
		//Validateチェック
		//データ形式
		if ($params['import_type'] === self::DATA_TYPE_LOCAL) {
			//データ形式がローカルの場合ファイル情報
			if ($params['import_file'] === NULL)
				throw new Exception('ローカル選択時はファイル指定は必須です。');
		} else if ($params['import_type'] === self::DATA_TYPE_URL) {
			//データ形式がURLの場合ファイルURL
			if (!$params['import_url'])
				throw new Exception('Remote Server Url指定時はURLの入力は必須です。');
		} else {
			throw new Exception('Invalid data type .');
		}

		//個人情報有無
		if ($params['personal'] != 0 && $params['personal'] != 1)
			throw new Exception('Invalid personal data inclusion flag.');

		//オプション::ドメイン
		if (!$params['domain'])
			throw new Exception('Please select the domain.');
		//domains no regist
		$domains = ServerParam::getVal('domains');
		if (!$domains)
			throw new Exception('Please set the domains in the management screen.');
		//domain check
		if (array_key_exists($params['domain'], ServerParam::getDomainList()) === false)
			throw new Exception('Domain is invalid.');
	}

}
