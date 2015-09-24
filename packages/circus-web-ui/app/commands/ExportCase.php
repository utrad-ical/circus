<?php

use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class ExportCase extends TaskCommand {
	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'case:export';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Export case data.';

	/**
	 * Column names to be exported.
	 *
	 * @var Array
	 */
	private $_exportColumn = array(
		'case' => array('projectID','caseID', 'revisions'),
		'label' => array('labelID', 'x', 'y', 'z', 'w', 'h', 'd', 'creator')
	);

	/**
	 * Export target key.
	 */
	const EXPORT_TARGET_CASE = 'case';

	/**
	 * Export target key.
	 */
	const EXPORT_TARGET_LABEL = 'label';

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
		$caseIds = $this->argument('cases');
		if (!$caseIds) {
			$this->error('Please select the Export target of the case.');
			return;
		}

		$outputPath = $this->argument('output-path');
		if (!$outputPath) {
			$this->error('Please specify the destination folder.');
			return;
		}

		$this->exportCaseData();
		$this->markTaskAsFinished();
	}

	/**
	 * Case Data Export main processing
	 * @return boolean Processing result
	 */
	protected function exportCaseData()
	{
		// Get case information
		$caseIds = explode(',', $this->argument('cases'));
		$counter = 1;
		$outputPath = $this->argument('output-path');
		$series_list = array();

		try {
			foreach ($caseIds as $caseId) {
				$case_data = ClinicalCase::find($caseId);

				if ($case_data == null) {
					$this->error('Invalid caseID: ' . $caseId);
					return false;
				}
				// Optional: tag set to the latest revision
				if ($this->option('tag')) {
					$case_data->appendTags(explode(',', $this->option('tag')));
					$case_data->save();
				}

				$revision = $case_data['latestRevision'];

				// Remove unnecessary keys from the exported data.
				$this->excludeUnnecessaryItems($case_data, self::EXPORT_TARGET_CASE);

				$dir = $outputPath."/cases/".$caseId;
				if (!is_dir($dir)) {
					mkdir($dir, 0777, true); // make directory recursively
				}
				$file_name = $dir.'/case.json';
				file_put_contents($file_name, json_encode($case_data));
				$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
				$counter++;

				//Create a list of series UID
				foreach ($revision['series'] as $series) {
					if (array_search($series['seriesUID'], $series_list) === false) {
						$series_list[] = $series['seriesUID'];
					}

					//Label data creation
					if (array_key_exists('labels', $series)) {
						$this->createLabelData($series['labels'], $caseId, $counter);
					}
				}
			}

			//The output of the series data
			$this->createSeriesData($series_list, $counter);

			//tgz compression
			$tmp_file_name = Str::random(32);
			$phar = new PharData($outputPath.'/'.$tmp_file_name.'.tar');
			$tmpAry = $phar->buildFromDirectory($outputPath);
			$phar->compress(Phar::GZ, '.tgz');
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;

			//Delete a file other than tgz
			File::delete($outputPath.'/data.tar');
			$this->deleteTemporaryFiles($outputPath);
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");

			$transferPath = storage_path('transfer').'/'.$tmp_file_name.'.tgz';
			$tgzPath = $outputPath.'/'.$tmp_file_name.'.tgz';
			//AES暗号化（Passwordオプション有
			if ($this->option('password')) {
				$encrypt = openssl_encrypt(file_get_contents($tgzPath),'aes-256-ecb', $this->option('password'));
				$res_bin = file_put_contents($outputPath.'/'.$tmp_file_name.'.bin', $encrypt);

				unlink($tgzPath);
				$tgzPath = $outputPath.'/'.$tmp_file_name.'.bin';
				$transferPath = storage_path('transfer').'/'.$tmp_file_name.'.bin';
			}

			//共有用にtransferに移動
			copy($tgzPath, $transferPath);

			//ダウンロードURLをTaskに格納
			$this->task->saveDownloadPath($transferPath, true);

		} catch (Exception $e) {
			\Log::error($e);
			return false;
		}
		return true;
	}

	/**
	 * For creating label data Export
	 * @param Array $labels Label array
	 * @param string $caseId caseID
	 * @param integer $counter Progress counter for task management
	 */
	private function createLabelData($labels, $caseId, &$counter) {
		$outputPath = $this->argument('output-path');
		foreach ($labels as $label) {
			$label_data = Label::find($label['id']);
			if (!$label_data)
				throw new Exception('labelID ['.$label['id'].'] not found. ');

			$labelPath = $label_data->labelPath();

			$this->excludeUnnecessaryItems($label_data, self::EXPORT_TARGET_LABEL);

			$dir = $outputPath. "/cases/".$caseId."/labels/".$label['id'];
			if (!is_dir($dir)) {
				mkdir($dir, 0777, true); // make directory recursively
			}
			//Label JSON
			$file_name = $dir . '/label.json';
			file_put_contents($file_name, json_encode($label_data));
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;

			// Copy label voxel file
			copy($labelPath, $dir . '/voxels.gz');
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;
		}
	}

	/**
	 * For creating series data Export
	 * @param Array $series_list Series array
	 * @param integer $counter Progress counter for task management
	 */
	private function createSeriesData($series_list, &$counter) {
		$outputPath = $this->argument('output-path');
		//The output of the series data
		foreach ($series_list as $series) {
			$series_data = Series::find($series);
			if (!$series_data)
				throw new Exception('seriesUID ['.$series.'] not found. ');

			$dir = $outputPath."/series/".$series;
			if (!is_dir($dir)) {
				mkdir($dir, 0777, true); // make directory recursively
			}
			$path = Storage::find($series_data->storageID);
			$dicom_path = $path->dicomStoragePath($series);

			if ($dicom_dir = opendir($dicom_path)) {
				while (($file = readdir($dicom_dir)) !== false) {
					if ($file != "." && $file != "..") {
						if ($this->option('without-personal')) {
							//個人情報なし
							Process::exec($this->utilityPath() . " anonymize --out=".$dir."/".$file." ".$dicom_path."/".$file);
						} else {
							//個人情報有
							copy($dicom_path."/".$file, $dir."/".$file);
						}
						$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
						$counter++;
				    }
				}
			    closedir($dicom_dir);
			}
		}
	}

	/**
	 * Temporary data deletion
	 * @param string $target_dir Folder path
	 * @param boolean $preserve Whether or not leave without deleting the specified folder itself(True if the Leave, False if the Delete)
	 */
	private function deleteTemporaryFiles($target_dir, $preserve = true)
	{
		if (!File::isDirectory($target_dir)) return false;

		$items = new FilesystemIterator($target_dir);

		foreach ($items as $item) {
			if ($item->isDir()) {
				self::deleteTemporaryFiles($item->getPathname(), false);
			} else if ($item->getFilename() != ".gitignore") {
				$file_name = $item->getPathname();
				$ext = pathInfo($file_name, PATHINFO_EXTENSION);
				if ($ext !== 'tgz') {
					File::delete($file_name);
				}
			}
		}

		if (!$preserve) {
			@rmdir($target_dir);
		}
		return true;
	}

	private function excludeUnnecessaryItems(&$data, $mode) {
		$export_columns = $this->_exportColumn[$mode];
		foreach ($data->toArray() as $key => $value) {
			if (array_search($key, $export_columns) === false)
				unset($data->$key);
		}
	}

	private function utilityPath()
	{
		return app_path() . '/bin/dicom_utility';
	}

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('cases', InputArgument::REQUIRED, 'Case IDs of the target cases'),
			array('output-path', InputArgument::REQUIRED, 'Output path.')
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
			array('tag', null, InputOption::VALUE_OPTIONAL, 'Tags to be applied to the latest revision', null),
			array('password', null, InputOption::VALUE_OPTIONAL, 'Add the password to the compressed file', null)
		);
	}

}
