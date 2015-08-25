<?php

use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class CaseImportVolume extends TaskCommand {
	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'case:import-volume';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Import case data.';

	/**
	 * Column names to be imported.
	 *
	 * @var Array
	 */
	private $_importColumn = array(
		'case' => array('projectID','caseID', 'revisions'),
		'label' => array('labelID', 'x', 'y', 'z', 'w', 'h', 'd', 'creator')
	);

	/**
	 * Import target key.
	 */
	const IMPORT_TARGET_CASE = 'case';

	/**
	 * Import target key.
	 */
	const IMPORT_TARGET_LABEL = 'label';

	/**
	 * Import data type.
	 */
	const DATA_TYPE_LOCAL = "local";
	/**
	 * Import data type.
	 */
	const DATA_TYPE_URL = "url";
	/**
	 * Import data type.
	 */
	private $_dataType = array(
		self::DATA_TYPE_LOCAL,
		self::DATA_TYPE_URL
	);

	/**
	 * Create a new command instance.
	 *
	 * @return void
	 */
	public function __construct()
	{
		parent::__construct();
	}

	/**
	 * Execute the console command.
	 *
	 * @return mixed
	 */
	public function fire()
	{
		try {
			//URLまたはファイル
			$dataType = $this->argument('data-type');
			if (!$dataType || array_search($dataType, $this->_dataType) === false) {
				$this->error('Please select the Import data type .');
			}

			$filePath = $this->argument('input-path');
			if ($filePath) {
				$this->error('Please specify the copy source folder.');
			}

			$this->importCaseData();
			Log::debug('インポート完了');
			$this->markTaskAsFinished();
		}catch (Exception $e) {
			Log::error($e);
			throw $e;
		}
	}

	/**
	 * Case Data Import main processing
	 * @return boolean Processing result
	 */
	protected function importCaseData()
	{
		$counter = 1;
		//インポート元ファイル
		$inputPath = $this->argument('input-path');
		//URL or Local
		$dataType = $this->argument('data-type');

		$dataPath = $inputPath;
		try {
			//URLの場合はURLから該当データを取得する
			if ($dataType === self::DATA_TYPE_URL) {
				$dataPath = $this->getInputFile($inputPath);
				$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
				$counter++;
			}

			//解凍処理
			$unZipPath = $this->unZip($dataPath);
			$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
			$counter++;

			//インポート処理
			$this->import($unZipPath, $counter);
		} catch (Exception $e) {
			Log::error($e);
			return false;
		}
		return true;
	}

	private function import($targetDir, &$counter)
	{
		//シリーズ情報保存
		if (is_dir($targetDir.'/series')) {
			if ($dicomDir = opendir($targetDir.'/series')) {
				while (($file = readdir($dicomDir)) !== false) {
					if ($file != "." && $file != "..") {
						//シリーズ存在チェック
						$series = Series::find($file);
						if (!$series) {
							//存在しないシリーズなのでシリーズデータを登録する
							$this->createSeries($targetDir.'/series', $file);
							$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
							$counter++;
						}
				    }
				}
			    closedir($dicomDir);
			}
		}

		//ケース情報保存
		//TODO::外だしして既存のケース登録とまとめる
		if (is_dir($targetDir.'/cases')) {
			if ($caseDir = opendir($targetDir.'/cases')) {
				while(($file = readdir($caseDir)) !== false) {
					if ($file != "." && $file != "..") {
						Log::debug("Case::".$file);
						//ケース存在チェック
						$caseObj = ClinicalCase::find($file);
						if (!$caseObj) {
							//存在しないケースなのでケースデータを登録する
							$this->createCase($targetDir.'/cases', $file);
						} else {
							//存在するケースなのでケースデータを更新する
							$this->updateCase($targetDir.'/cases', $file);
						}
						$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
						$counter++;

						/*
						//ラベル情報保存
						$labelDir = $targetDir.'/cases/'.$file.'/labels';
						if (file_exists($labelDir)) {
							$this->createLabelData($labelDir, $counter);
						}
						*/
						Log::debug('ケース情報保存終わり');
					}
				}
			}
		}
	}

	private function createLabelData($labelDir, &$counter)
	{
		if ($dir = opendir($labelDir)) {
			while(($file = readdir($dir)) !== false) {
				if ($file != "." && $file != "..") {
					$labelObj = Label::find($file);
					if (!$labelObj) {
						//存在しないラベルなのでラベルデータを登録する
						$this->createLabel($labelDir, $file);
						$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
						$counter++;
					}
				}
			}
		}
	}

	private function createLabel($caseDir, $labelID)
	{
		$path = $caseDir . '/'.$labelID;
		$labelFile = $path.'/label.json';
		$tgzFile = $path.'/voxcels.gz';
		if (!file_exists($labelFile))
			throw new Exception('ラベルデータがありません。');
		if (!file_exists($tgzFile))
			throw new Exception('ラベル画像がありません。');

		$tmpLabel = file($labelFile);

		//ラベルデータファイル保存
		$storage = Storage::getCurrentStorage(Storage::LABEL_STORAGE);
		if (!$storage || !$storage->path)
			throw new Exception('ラベル保存先が設定されていません。');
		copy($tgzFile, $storage->path.'/'.$labelID.'.gz');

		//ラベル情報保存
		$labelObj = new Label();
		$labelObj = $tempLabel;
		$labelObj->storageID = $storage->storageID;
		$labelObj->save();
	}

	private function validateCase($path, $caseID)
	{
		try {
			$caseDir = $path . '/' . $caseID;
			if (!is_dir($caseDir))
				return;

			$caseFile = $caseDir.'/case.json';
			if (!file_exists($caseFile))
				throw new Exception($caseID.'のcase.jsonが存在しません。');

			$tmpCase = file($caseFile);

			$caseData = json_decode($tmpCase[0], true);

			//プロジェクトIDのチェック
			if (!isset($caseData['projectID']))
				throw new Exception('プロジェクトIDがありません。');
			if (!Project::find($caseData['projectID']))
				throw new Exception('プロジェクトID['.$caseData['projectID'].']が存在しません。');
			//リビジョン情報のチェック
			if (!isset($caseData['revisions']))
				throw new Exception('リビジョン情報がありません。');

			$latestNo = 0;
			$patientInfo = array();
			$domains = array();
			foreach ($caseData['revisions'] as $rNo => $revision) {
				if (!isset($revision['series']))
					throw new Exception('リビジョン['.$rNo.']内にシリーズ情報がありません。');
				//シリーズIDのチェック
				foreach ($revision['series'] as $series) {
					if (!isset($series['seriesUID']))
						throw new Exception('シリーズUIDがありません。');
					if (!Series::find($series['seriesUID']))
						throw new Exception('シリーズUID['.$series['seriesUID'].']が存在しません。');

					$seriesObj = Series::find($series['seriesUID']);
					if (!$patientInfo)
						$patientInfo = $seriesObj->patientInfo;
					$domains[] = $seriesObj->domain;
				}

				if ($revision === end($caseData['revisions'])) {
			        $latestNo = $rNo;
			    }

			}
			return array('result'         => true,
						 'patientInfo'    => $patientInfo,
						 'latestRevision' => $latestNo,
						 'domains'        => array_unique($domains));
		} catch (Exception $e) {
			Log::error($e);
			return array('result' => false, 'errorMsg' => $e->getMessage());
		}

	}

	private function createCase($dirPath, $caseID)
	{
		Log::debug('CreateCase!!');
		$res = $this->validateCase($dirPath, $caseID);
		if ($res['result'] === false)
			throw new Exception($res['errorMsg']);

		$caseFile = $dirPath. '/' . $caseID . '/case.json';
		$tmpCase = file($caseFile);
		$caseData = $json_decode($tmpCase, true);

		//ケース情報登録処理
		$caseObj = new ClinicalCase();
		$caseObj->caseID = $caseData['caseID'];
		$caseObj->projectID = $caseData['projectID'];
		$caseObj->patientInfoCache = $res['patientInfo'];
		$caseObj->tags = array();
		$caseObj->latestRevision = $caseData['revisions'][$res['latestRevision']];
		$caseObj->revisions = $caseData['revisions'];
		$caseObj->domains = $res['domains'];
		$caseObj->save();

		Log::debug('createCase finish!!');
	}

	private function updateCase($dirPath, $caseID)
	{
		Log::debug('updateCase!!');
		$res = $this->validateCase($dirPath, $caseID);
		Log::debug('Validate結果::');
		Log::debug($res);
		if ($res['result'] === false)
			throw new Exception($res['errorMsg']);

		$caseFile = $dirPath. '/' . $caseID . '/case.json';
		$tmpCase = file($caseFile);
		$caseData = $json_decode($tmpCase, true);

		//存在Revisionチェック
		$caseObj = ClinicalCase::find($caseID);
		//TODO::リビジョン入れ子
		/*
		$revisions = $this->createRevision($caseObj->revisions, $caseData['revisions']);
		Log::debug('リビジョン情報::');
		Log::debug($revisions);

		//ケース更新
		end($revisions);
		$revisionNo = key($revisions);
		$caseObj->latestRevision = $revisions[$revisionNo];
		$caseObj->revisions = $revisions;
		*/
		$caseObj->save();

	}

	private function createRevision($oldRevisions, $addRevisions)
	{
		$revisions = $oldRevisions;
		foreach ($oldRevisions as $oldKey => $oldRevision) {
			foreach ($addRevisions as $addKey => $addRevision) {
				//TODO::creatorとdateを比較
				$addRevision['date'] = new MongoDate($addRevision['date']['sec'], $addRevision['date']['usec']);
				//作成者または作成日が不一致
				if ($oldRevision['date'] !== $addRevision['date']
					|| $oldRevision['creator'] !== $addRevision['creator']) {
					if (strtotime($oldRevision['date']) < strtotime($addRevision['date'])) {
						continue;
					} else {
						Log::debug('挿入前のリビジョン情報::');
						$revisions = array_splice($revisions, $oldKey, 0, $addRevision);
					}
				}
			}
		}
		return $revisions;
	}

	private function createSeries($dirPath, $seriesUID)
	{
		$dataPath = $dirPath.'/'.$seriesUID;
		if (!is_dir($dataPath))
			return;

		if ($dicomDir = opendir($dataPath)) {
			while(($file = readdir($dicomDir)) !== false) {
				if ($file != "." && $file != "..") {
					if ($this->option('without-personal')) {
						//個人情報なし
						Process::exec($this->utilityPath() . " anonymize ".$dicomDir."/".$file);
					}
					$cmd_ary = array();
					$cmd_ary['path'] = $dataPath."/".$file;
					Artisan::call("image:import", $cmd_ary);
			    }
			}
		    closedir($dicomDir);
		}
	}

	private function utilityPath()
	{
		return app_path() . '/bin/dicom_utility';
	}

	private function unZip($path)
	{
		$handle = fopen($path, "rb");
		$binaryData = fread($handle, filesize($path));

		$tmpPath = $path;
		if (bin2hex(substr($binaryData, 0, 2)) !== '1f8b' && pathInfo($path, PATHINFO_EXTENSION) !== 'tgz') {
			//パスワード付ファイル
			if (!$this->option('password'))
				throw new Exception("ご指定のファイルはパスワードが付与されています。\nパスワードを入力してください。");

			//拡張子以外を取得
			$tmpPath = pathinfo($path, PATHINFO_DIRNAME).'/'.pathInfo($path, PATHINFO_FILENAME);
			$decrypt = openssl_decrypt(file_get_contents($path), 'aes-256-ecb', $this->option('password'));

			$res_tgz = file_put_contents($tmpPath.'.tgz', $decrypt);
			$tmpPath = $tmpPath.'.tgz';

		}
		fclose($handle);

		//解凍処理
		$phar = new PharData($tmpPath);
		$baseDir = pathinfo($tmpPath, PATHINFO_DIRNAME);
		if (!is_dir($baseDir.'/temp'))
			mkdir($baseDir.'/temp', 0777, true); // make directory recursively

		$phar->extractTo($baseDir.'/temp');

		Log::debug('解凍先ディレクトリ::');
		Log::debug($baseDir.'/temp');
		return $baseDir.'/temp';
	}

	private function getInputFile($path)
	{
		$ch = curl_init();

		$tempStr = Str::random(32);
		$tempDir = storage_path('cache').'/'.$tempStr;
		if (!is_dir($tempDir))
			mkdir($tempDir, 0777, true); // make directory recursively
		//$tempPath = $tempDir.'/test.tgz';

		curl_setopt($ch, CURLOPT_URL,$path);
		curl_setopt($ch, CURLOPT_HEADER, true);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
		$result = curl_exec($ch);
		curl_close($ch);

		if (!$result)
			throw new Exception('指定URLからのファイルダウンロードに失敗しました。');

		$fileName = $this->getFileName($result);
		Log::debug('ダウンロードファイル名::');
		Log::debug($fileName);

		$data = explode("\n", $result);

		file_put_contents($tempDir.'/'.$fileName, $data[count($data)-1]);
		return $tempDir.'/'.$fileName;
	}

	private function getFileName($res)
	{
		Log::debug('Headerコールバック関数Called');
		if (!$res) return;

		$tmpAry = explode("\n", $res);

		$headers = array();
		foreach ($tmpAry as $tmpStr) {
			if (strpos($tmpStr, ':') !== false) {
				list($headerKey, $headerVal) = explode(':', $tmpStr);
				$headers[$headerKey] = $headerVal;
			}
		}
		if (isset($headers['Content-Disposition'])) {
			$disposition = $headers['Content-Disposition'];
			$idx = strpos($disposition, 'filename="');
			Log::debug('Index::'.$idx);
			Log::debug('全体の文字列長::'.strlen($disposition));
			Log::debug(strlen($disposition)-($idx+12));
			Log::debug(substr($disposition, $idx+10, strlen($disposition)-($idx+12)));
			return substr($disposition, $idx+10, strlen($disposition)-($idx+12));
		}
	}

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('data-type', InputArgument::REQUIRED, 'Case IDs of the target cases'),
			array('input-path', InputArgument::REQUIRED, 'Output path.')
		);
	}

	/**
	 * Get the console command options.
	 *
	 * @return array
	 */
	protected function getOptions()
	{
		return array(
			array('without-personal', null, InputOption::VALUE_NONE, 'Without exporting petientInfoCache.', null),
			array('tag', null, InputOption::VALUE_OPTIONAL, 'Tags to be applied to the case', null),
			array('password', null, InputOption::VALUE_OPTIONAL, 'Add the password to the compressed file', null),
			array('domains', null, InputOption::VALUE_OPTIONAL, 'Domains to be applied to the case', null)
		);
	}

}
