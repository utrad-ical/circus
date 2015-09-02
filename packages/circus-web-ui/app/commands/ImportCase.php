<?php

use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class ImportCase extends TaskCommand {
	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'case:import';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Import case data.';

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

	private $_projectID;
	private $_caseIds = array();

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
			$this->addTaskLog(array("result" => true, "projectID" => $this->_projectID, "caseIds" => $this->_caseIds));
			$this->markTaskAsFinished();
		}catch (Exception $e) {
			Log::error($e);
			$this->addTaskLog(array("result" => false, "errorMsg" => $e->getMessage()));
			$this->markTaskAsFinished();
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
	}

	/**
	 * インポート処理
	 * @param string $targetDir インポート対象ディレクトリパス
	 * @param integer $counter タスク管理用進捗カウンタ
	 */
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
		if (!is_dir($targetDir.'/cases'))
			throw new Exception('ケースディレクトリがありません。');

		if ($caseDir = opendir($targetDir.'/cases')) {
			while(($file = readdir($caseDir)) !== false) {
				if ($file != "." && $file != "..") {
					//ケース存在チェック
					$caseObj = ClinicalCase::find($file);
					$this->_caseIds[] = $file;

					$dirPath = $targetDir.'/cases';
					$res = $this->validateCase($dirPath, $file);
					if ($res['result'] === false)
						throw new Exception($res['errorMsg']);

					$caseData = $this->getJsonFromFile($dirPath. '/' . $file . '/case.json');
					$this->registerCase($caseData, $res);
					$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
					$counter++;
					if (file_exists($dirPath.'/'.$file.'/labels')) {
						$this->createLabelData($dirPath.'/'.$file.'/labels', $counter);
					}
				}
			}
		}
	}

	/**
	 * ラベルデータが存在しない場合はラベルデータを登録する
	 * @param string $labelDir labelsディレクトリパス
	 * @param integer $counter タスク進捗カウンタ
	 */
	private function createLabelData($labelDir, &$counter)
	{
		if ($dir = opendir($labelDir)) {
			while(($file = readdir($dir)) !== false) {
				if ($file != "." && $file != "..") {
					$labelObj = Label::find($file);
					if (!$labelObj) {
						//存在しないラベルなのでラベルデータを登録する
						$this->registerLabel($labelDir, $file);
						$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
						$counter++;
					}
				}
			}
		}
	}

	/**
	 * Register the label information
	 * @param string $labelDir labelsディレクトリパス
	 * @param string $labelID ラベルID
	 */
	private function registerLabel($labelDir, $labelID)
	{
		$path = $labelDir . '/'.$labelID;
		$labelFile = $path.'/label.json';
		$tgzFile = $path.'/voxels.gz';
		if (!file_exists($labelFile))
			throw new Exception('ラベルデータがありません。');
		if (!file_exists($tgzFile))
			throw new Exception('ラベル画像がありません。');

		$labelData = $this->getJsonFromFile($labelFile);

		//ラベルデータファイル保存
		$storage = Storage::getCurrentStorage(Storage::LABEL_STORAGE);
		if (!$storage || !$storage->path)
			throw new Exception('ラベル保存先が設定されていません。');
		copy($tgzFile, $storage->path.'/'.$labelID.'.gz');

		//ラベル情報保存
		$labelObj = App::make('Label');
		foreach ($labelData as $key => $val) {
			$labelObj->$key = $val;
		}
		$labelObj->storageID = $storage->storageID;
		$labelObj->save();
	}

	/**
	 * ファイルからJSONデータを抽出する
	 * @param string $path ファイルパス
	 * @return string JSONデータ
	 */
	private function getJsonFromFile($path)
	{
		if (!file_exists($path))
			throw new Exception($path.'が存在しません。');

		$lines = file($path);
		if ($lines === false || count($lines) !== 1)
			throw new Exception($path.'の中身が不正です。');

		return json_decode($lines[0], true);
	}

	/**
	 * ケースデータValidate
	 * @param string $path ケースディレクトリパス
	 * @param string $caseID ケースID
	 * @return Array Validate結果
	 */
	private function validateCase($path, $caseID)
	{
		try {
			$caseDir = $path . '/' . $caseID;
			if (!is_dir($caseDir))
				return;

			$caseData = $this->getJsonFromFile($caseDir.'/case.json');
			//プロジェクトIDのチェック
			if (!isset($caseData['projectID']))
				throw new Exception('プロジェクトIDがありません。');
			if (!Project::find($caseData['projectID']))
				throw new Exception('プロジェクトID['.$caseData['projectID'].']が存在しません。');
			$this->_projectID = $caseData['projectID'];
			//リビジョン情報のチェック
			if (!isset($caseData['revisions']))
				throw new Exception('リビジョン情報がありません。');

			$seriesIds = array();
			foreach ($caseData['revisions'] as $rNo => $revision) {
				if (!isset($revision['series']))
					throw new Exception('リビジョン['.$rNo.']内にシリーズ情報がありません。');
				//シリーズIDのチェック
				foreach ($revision['series'] as $series) {
					if (!isset($series['seriesUID']))
						throw new Exception('シリーズUIDがありません。');
					$seriesIds[] = $series['seriesUID'];
				}
			}
			$seriesIds = array_unique($seriesIds);

			//Latest Revision No.
			end($caseData['revisions']);
			//PatientInfo
			$seriesObj = Series::find($seriesIds[0]);

			return array('result'         => true,
						 'patientInfo'    => $seriesObj->patientInfo,
						 'latestRevision' => key($caseData['revisions']),
						 'domains'        => Series::getDomains($seriesIds));
		} catch (Exception $e) {
			Log::error($e);
			return array('result' => false, 'errorMsg' => $e->getMessage());
		}

	}

	/**
	 * Register the case
	 * @param Array $caseData Array of the case information
	 */
	private function registerCase($caseData , $newCaseData)
	{
		$caseObj = ClinicalCase::find($caseData['caseID']);

		$params = array();
		$caseID = null;
		$revisions = array();

		$this->formatRevisionDate($caseData['revisions']);
		if ($caseObj) {
			//既存ケース
			$tmpCase = $caseObj->toArray();
			$this->formatRevisionDate($tmpCase['revisions']);

			//リビジョン入れ子
			$revisions = $this->createRevision($tmpCase['revisions'], $caseData['revisions']);
			$caseID = $caseObj->caseID;
		} else {
			//新規ケース
			$params = $caseData;
			$params['patientInfoCache'] = $newCaseData['patientInfo'];
			$params['tags'] = array();
			$params['domains'] = $newCaseData['domains'];
			$revisions = $caseData['revisions'];
		}
		//最新リビジョン設定
		end($revisions);
		$revisionNo = key($revisions);

		$this->formatUnixtimeToMongodate($revisions);

		$params['latestRevision'] = $revisions[$revisionNo];
		$params['revisions'] = $revisions;
		ClinicalCase::saveCase($params, $caseID);
	}

	/**
	 * Revisionの日付を整形する
	 * @param Array $revisions revision配列
	 */
	private function formatRevisionDate(&$revisions)
	{
		foreach ($revisions as $revKey => $revVal) {
			if (is_array($revVal['date'])) {
				$revisions[$revKey]['date'] = $revVal['date']['sec'];
			} else {
				$revisions[$revKey]['date'] = $revVal['date']->sec;
			}
		}
	}

	/**
	 * Revisionデータ生成(入れ子対応)
	 * @param Array $oldRevisions 既存のリビジョン情報
	 * @param Array $addRevisions 登録予定のリビジョン情報
	 * @return Array $revisions 入れ子対応したリビジョン情報
	 */
	private function createRevision($oldRevisions, $addRevisions)
	{

		$addRevNo = 0;
		foreach ($addRevisions as $addKey => $addRevision) {
			$addPlace = 0;
			foreach ($oldRevisions as $oldKey => $oldRevision) {
				$addRevNo = $oldKey;
				//creatorとdateを比較
				//作成者または作成日が不一致
				if ($oldRevision['date'] !== $addRevision['date']
					|| $oldRevision['creator'] !== $addRevision['creator']) {

					if ($oldRevision['date'] > $addRevision['date']) {
						$addPlace = 1;
						break;
					} else if ($oldRevision['date'] < $addRevision['date']) {
						$addPlace = 2;
					} else {
						//日付けは一致しているが作成者が違う
						$addPlace = 3;
					}
				} else {
					$addPlace = 0;
					break;
				}
			}

			if ($addPlace === 2 || $addPlace === 3) {
				if (count($oldRevisions) - 1 < $addRevNo + 1) {
					$oldRevisions[$addRevNo + 1] = $addRevision;
				} else {
					array_splice($oldRevisions, $addRevNo+1, 0, array($addRevision));
				}
			} else if($addPlace === 1) {
				array_splice($oldRevisions, $addRevNo, 0, array($addRevision));
				$addRevNo++;
			}
		}

		ksort($oldRevisions);
		return $oldRevisions;
	}

	private function formatUnixtimeToMongodate(&$revisions)
	{
		foreach ($revisions as $key => $revision) {
			$revisions[$key]['date'] = new MongoDate($revision['date']);
		}
	}

	/**
	 * シリーズデータ作成
	 * @param string $dirPath seriesディレクトリパス
	 * @param string $seriesUID シリーズID
	 */
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
					if ($this->option('domain')) {
						$cmd_ary['--domain'] = $this->option('domain');
					}
					Artisan::call("image:import", $cmd_ary);
			    }
			}
		    closedir($dicomDir);
		}
	}

	/**
	 * DICOMUtilityのパス
	 */
	private function utilityPath()
	{
		return app_path() . '/bin/dicom_utility';
	}

	/**
	 * 圧縮ファイル解凍処理
	 * @param string $path 圧縮ファイルパス
	 * @return string 解凍先ディレクトリパス
	 */
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

		return $baseDir.'/temp';
	}

	/**
	 * 指定されたファイルからImport対象ファイルをダウンロードする
	 * @param string $path ImportURL
	 * @return string ファイルパス
	 */
	private function getInputFile($path)
	{
		$ch = curl_init();

		$tempStr = Str::random(32);
		$tempDir = storage_path('cache').'/'.$tempStr;
		if (!is_dir($tempDir))
			mkdir($tempDir, 0777, true); // make directory recursively

		curl_setopt($ch, CURLOPT_URL,$path);
		curl_setopt($ch, CURLOPT_HEADER, true);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
		$result = curl_exec($ch);
		curl_close($ch);

		if (!$result)
			throw new Exception('指定URLからのファイルダウンロードに失敗しました。');

		$fileName = $this->getFileName($result);
		$data = explode("\n", $result);

		file_put_contents($tempDir.'/'.$fileName, $data[count($data)-1]);
		return $tempDir.'/'.$fileName;
	}

	/**
	 * CURLレスポンスデータからダウンロードファイル名を取得する
	 * @param string $res CURLレスポンスデータ
	 * @return string ダウンロードファイル名
	 */
	private function getFileName($res)
	{
		if (!$res) return;

		$tmpAry = explode("\n", $res);

		$headers = array();
		foreach ($tmpAry as $tmpStr) {
			if (strpos($tmpStr, ':') !== false) {
				list($headerKey, $headerVal) = explode(':', $tmpStr);
				$headers[$headerKey] = $headerVal;
			}
		}
		if (!isset($headers['Content-Disposition']))
			throw new Exception('ファイル名が取得できません。');

		$disposition = $headers['Content-Disposition'];
		$idx = strpos($disposition, 'filename="');
		return substr($disposition, $idx+10, strlen($disposition)-($idx+12));
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
			array('domain', null, InputOption::VALUE_OPTIONAL, 'Domain to be applied to the case', null)
		);
	}

}