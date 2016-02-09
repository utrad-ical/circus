<?php

use Illuminate\Support\Facades\File;
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
	 */
	public function __construct()
	{
		parent::__construct();
	}

	/**
	 * Execute the console command.
	 */
	public function fire()
	{
		try {
			//URL or File
			$dataType = $this->argument('data-type');
			if (!$dataType || array_search($dataType, $this->_dataType) === false) {
				$this->error('Please specify import data type (local or url).');
			}

			$filePath = $this->argument('input-path');
			if ($filePath) {
				$this->error('Please specify input data.');
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

		// File name for import
		$inputPath = $this->argument('input-path');
		// data type (URL or Local)
		$dataType = $this->argument('data-type');

		$dataFilePath = $inputPath;

		// Get import data from specified URL
		if ($dataType === self::DATA_TYPE_URL) {
			$dataFilePath = $this->getInputFile($inputPath);
			$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
			$counter++;
		}

		// Extract import data
		$unZipPath = $this->unZip($dataFilePath);
		$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
		$counter++;

		// Main process to import case
		$this->import($unZipPath, $counter);

		// Delete extracted files
		File::deleteDirectory($unZipPath, true);
	}

	/**
	 * Import process
	 * @param string $targetDir Import target directory path
	 * @param integer $counter Task management for progress counter
	 * @throws Exception
	 */
	private function import($targetDir, &$counter)
	{
		//register series
		$seriesDirPath = $targetDir.'/series';
		if (is_dir($seriesDirPath)) {
			if ($dicomDir = opendir($seriesDirPath)) {
				while (($file = readdir($dicomDir)) !== false) {
					if ($file != "." && $file != "..") {
						//check series presence
						$series = Series::find($file);
						if (!$series) {
							//Because unregistered series, register the new series information.
							$this->createSeries($seriesDirPath, $file);
							$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
							$counter++;
						}
					}
				}
				closedir($dicomDir);
			}
		}

		$caseDirPath = $targetDir.'/cases';
		//register case
		if (!is_dir($caseDirPath))
			throw new Exception('Has not the case directory .');

		if ($caseDir = opendir($caseDirPath)) {
			while(($file = readdir($caseDir)) !== false) {
				if ($file != "." && $file != "..") {
					$this->_caseIds[] = $file;
					$res = $this->validateCase($caseDirPath, $file);
					if ($res['result'] === false)
						throw new Exception($res['errorMsg']);
					$caseData = $this->getJsonFromFile($caseDirPath. '/' . $file . '/case.json');
					$this->registerCase($caseData, $res);
					$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
					$counter++;

					$labelDirPath = $caseDirPath.'/'.$file.'/labels';
					if (file_exists($labelDirPath)) {
						$this->createLabelData($labelDirPath, $counter);
					}
				}
			}
		}
	}

	/**
	 * Because unregistered labels, register the new label information.
	 * @param string $labelDir directory path of labels
	 * @param integer $counter Task progress counter
	 */
	private function createLabelData($labelDir, &$counter)
	{
		if ($dir = opendir($labelDir)) {
			while(($file = readdir($dir)) !== false) {
				if ($file != "." && $file != "..") {
					$labelObj = Label::find($file);
					if (!$labelObj) {
						//register label
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
	 * @param string $labelDir directory path of labels
	 * @param string $labelID label ID
	 * @throws Exception
	 */
	private function registerLabel($labelDir, $labelID)
	{
		$path = $labelDir . '/'.$labelID;
		$labelFile = $path.'/label.json';
		$tgzFile = $path.'/voxels.gz';
		if (!file_exists($labelFile))
			throw new Exception('Not found label data .');
		if (!file_exists($tgzFile))
			throw new Exception('Not found label images .');

		$labelData = $this->getJsonFromFile($labelFile);

		// Get path for saving label data
		$storage = Storage::getCurrentStorage(Storage::LABEL_STORAGE);
		if (!$storage || !$storage->path)
			throw new Exception('Not set label destination .');

		// Register label information into DB
		$labelObj = App::make('Label');
		foreach ($labelData as $key => $val) {
			$labelObj->$key = $val;
		}
		$labelObj->storageID = $storage->storageID;
		$labelObj->save();

		// Copy label data (*.gz)
		$dstTgzFile = $labelObj->labelPath();
		$dir = dirname($dstTgzFile);
		if (!is_dir($dir)) {
			$res_md = mkdir($dir, 0777, true);
			if (!$res_md)
				throw new Exception('Failed create folder .');
		}
		copy($tgzFile, $dstTgzFile);
	}

	/**
	 * Extract the JSON data from a file
	 * @param string $path file path
	 * @return string json data
	 * @throws Exception
	 */
	private function getJsonFromFile($path)
	{
		if (!file_exists($path))
			throw new Exception($path.'not found .');

		$lines = file($path);
		if ($lines === false || count($lines) !== 1)
			throw new Exception($path.' contents of is invalid');

		return json_decode($lines[0], true);
	}

	/**
	 * Case data validate
	 * @param string $path path of the case directory
	 * @param string $caseID case ID
	 * @return Array validate results
	 */
	private function validateCase($path, $caseID)
	{
		try {
			$caseDir = $path . '/' . $caseID;
			if (!is_dir($caseDir))
				return;

			$caseData = $this->getJsonFromFile($caseDir.'/case.json');
			//check project ID
			if (!isset($caseData['projectID']))
				throw new Exception('project ID is not found .');
			if (!Project::find($caseData['projectID']))
				throw new Exception('project ID['.$caseData['projectID'].']is not found .');
			$this->_projectID = $caseData['projectID'];
			//check revision information
			if (!isset($caseData['revisions']))
				throw new Exception('revisions not found . ');

			$seriesIds = array();
			foreach ($caseData['revisions'] as $rNo => $revision) {
				if (!isset($revision['series']))
					throw new Exception("The revision['.$rNo.']don't have series information .");
				//check series ID
				foreach ($revision['series'] as $series) {
					if (!isset($series['seriesUID']))
						throw new Exception('Series ID not found.');
					$seriesIds[] = $series['seriesUID'];
				}
			}
			$seriesIds = array_unique($seriesIds);

			//Latest Revision No.
			end($caseData['revisions']);
			//PatientInfo
			$seriesObj = Series::find($seriesIds[0]);

			// tags
			$tags = array();
			if ($this->option('tag')) {
				$tag = $this->option('tag');
				$tagList = Project::getProjectTags(array($caseData['projectID']));
				if(array_key_exists($tag, $tagList))
					$tags[] = $tag;
				else
					throw new Exception("The tag['.$tag.'] is not found.");
			}

			return array('result'         => true,
						 'patientInfo'    => $seriesObj->patientInfo,
						 'latestRevision' => key($caseData['revisions']),
						 'domains'        => Series::getDomains($seriesIds),
						 'tags'           => $tags);
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

		$this->formatRevisionDate($caseData['revisions']);
		if ($caseObj) {
			//Existing case
			$tmpCase = $caseObj->toArray();
			$this->formatRevisionDate($tmpCase['revisions']);

			//リビジョン入れ子
			$revisions = $this->createRevision($tmpCase['revisions'], $caseData['revisions']);
			$caseID = $caseObj->caseID;
		} else {
			//新規ケース
			$params = $caseData;
			$params['patientInfoCache'] = $newCaseData['patientInfo'];
			$params['tags'] = $newCaseData['tags'];
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
	 * create series data
	 * @param string $dirPath path of the series directory
	 * @param string $seriesUID series ID
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
						//without personal information
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
	 * @throws Exception
	 */
	private function unZip($path)
	{
		$handle = fopen($path, "rb");
		$binaryData = fread($handle, filesize($path));

		$tmpPath = $path;
		if (bin2hex(substr($binaryData, 0, 2)) !== '1f8b' && pathInfo($path, PATHINFO_EXTENSION) !== 'tgz') {
			//Password-protected files
			if (!$this->option('password'))
				throw new Exception("Has password .\nPlease input password .");

			//Get except extension
			$tmpPath = pathinfo($path, PATHINFO_DIRNAME).'/'.pathInfo($path, PATHINFO_FILENAME);
			$decrypt = openssl_decrypt(file_get_contents($path), 'aes-256-ecb', $this->option('password'));

			//decrypt failed
			if ($decrypt === false)
				throw new Exception('Failed decrypt the file .');

			$tmpPath = $tmpPath.'.tgz';
			$res_tgz = file_put_contents($tmpPath, $decrypt);
			if ($res_tgz === false)
				throw new Exception('Failed decrypt the file .');
		}
		fclose($handle);

		//decompress
		$phar = new PharData($tmpPath);

		$tmpDir = Str::random(32);
		$baseDir = storage_path('cache') . '/' . $tmpDir;
		if (!is_dir($baseDir))
			mkdir($baseDir, 0777, true); // make directory recursively
		$res_extract = $phar->extractTo($baseDir);
		if (!$res_extract)
			throw new Exception('Failed decompress the file .');
		return $baseDir;
	}

	/**
	 * Download the import files from the specified file.
	 * @param string $path ImportURL
	 * @return string file path
	 * @throws Exception
	 */
	private function getInputFile($path)
	{
		try {
			$ch = curl_init();

			$tempStr = Str::random(32);
			$tempDir = storage_path('cache') . '/' . $tempStr;
			if (!is_dir($tempDir))
				mkdir($tempDir, 0777, true); // make directory recursively

			curl_setopt($ch, CURLOPT_URL, $path);
			curl_setopt($ch, CURLOPT_HEADER, true);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
			$result = curl_exec($ch);

			//get header size of the file
			$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
			//get header of the file
			$header_info = substr($result, 0, $header_size);
			//get body of the file
			$body_info = substr($result, $header_size);

			curl_close($ch);
			if (!$result)
				throw new Exception('Failed download from the specified URL .');

			$fileName = $this->getFileName($header_info);

			$filePath = $tempDir . '/' . $fileName;
			$file_byte = file_put_contents($filePath, $body_info);
			if ($file_byte === false)
				throw new Exception('Failed write of the downloaded file .');
		} catch (Exception $e) {
			Log::error($e);
			throw $e;
		}
		return $filePath;
	}

	/**
	 * Get the download file name from the CURL response data
	 * @param string $header_info response header information of CURL
	 * @return string download file name
	 * @throws Exception
	 */
	private function getFileName($header_info)
	{
		if (!$header_info) return;

		$tmpAry = explode("\n", $header_info);

		$headers = array();
		foreach ($tmpAry as $tmpStr) {
			if (strpos($tmpStr, ':') !== false) {
				list($headerKey, $headerVal) = explode(':', $tmpStr);
				$headers[$headerKey] = $headerVal;
			}
		}
		if (!isset($headers['Content-Disposition']))
			throw new Exception("Can't obtained Filename . ");

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