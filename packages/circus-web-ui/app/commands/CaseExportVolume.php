<?php

use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class CaseExportVolume extends TaskCommand {
	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'case:export-volume';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Export case data.';

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
			$this->error('Please select the Export target of the case .');
			return;
		}

		$outputPath = $this->argument('output-path');
		if (!$outputPath) {
			$this->error('Please specify the destination folder .');
			return;
		}

		$this->exportCaseData();
		$this->markTaskAsFinished();
		//return array("fileName" => $zip_file_name, "filePath" => $zip_file_path);
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
				//Options : personal information no output
				if ($this->option('without-personal')) {
					$case_data->patientInfoCache = array();
				}
				//Optional: tag set to the latest revision
				if ($this->option('tag')) {
					//TODO::最新リビジョンにタグ設定
				}

				$dir = $outputPath."/cases/".$caseId;
				if (!is_dir($dir)) {
					mkdir($dir, 0777, true); // make directory recursively
				}
				$file_name = $dir.'/case.json';
				file_put_contents($file_name, json_encode($case_data));
				$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
				$counter++;

				$revision = $case_data['latestRevision'];

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
			$phar = new PharData($outputPath.'/data.tar');
			$tmpAry = $phar->buildFromDirectory($outputPath);
			$phar->compress(Phar::GZ, '.tgz');
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;

			//Delete a file other than tgz
			File::delete($outputPath.'/data.tar');
			$this->deleteTemporaryFiles($outputPath);
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
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

			$dir = $outputPath. "/cases/".$caseId."/labels/".$label['id'];
			if (!is_dir($dir)) {
				mkdir($dir, 0777, true); // make directory recursively
			}
			//Label JSON
			$file_name = $dir . '/label.json';
			file_put_contents($file_name, json_encode($label_data));
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;

			//Label file
			$storage_info = Storage::find($label_data->storageID);
			$storage_path = $storage_info->path;

			$load_path = $storage_path."/".$label['id'].'.gz';

			copy($load_path, $dir."/voxcels.gz");
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
			            copy($dicom_path."/".$file, $dir."/".$file);
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

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('cases', InputArgument::REQUIRED, 'Export対象のケース.'),
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
			array('without-personal', null, InputOption::VALUE_NONE, 'Without exporting pertientInfoCache.', null),
			array('tag', null, InputOption::VALUE_NONE, 'Tags to be applied to the latest revision', null),
		);
	}

}
