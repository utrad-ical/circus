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
	}

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
				//オプション:個人情報出力なし
				if ($this->option('without-personal')) {
					$case_data->patientInfoCache = array();
				}
				//オプション：最新リビジョンにタグ設定
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

				//シリーズUIDのリストを作成する
				foreach ($revision['series'] as $series) {
					if (array_search($series['seriesUID'], $series_list) === false) {
						$series_list[] = $series['seriesUID'];
					}

					//ラベルデータ作成
					if (array_key_exists('labels', $series)) {
						$this->createLabelData($series['labels'], $caseId, $counter);
					}
				}
			}

			//シリーズデータの出力
			$this->createSeriesData($series_list, $counter);

			//tgz圧縮
			$phar = new PharData($outputPath.'/data.tar');
			$tmpAry = $phar->buildFromDirectory($outputPath);
			$phar->compress(Phar::GZ, '.tgz');
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;

			//圧縮が完了したのでtgz以外のファイルを削除する
			File::delete($outputPath.'/data.tar');
			$this->deleteTemporaryFiles($outputPath);
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
		} catch (Exception $e) {
			\Log::error($e);
			return false;
		}
		return true;
	}

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
			//ラベルJSON
			$file_name = $dir . '/label.json';
			file_put_contents($file_name, json_encode($label_data));
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;

			//ラベルファイル
			$storage_info = Storage::find($label_data->storageID);
			$storage_path = $storage_info->path;

			$load_path = $storage_path."/".$label['id'].'.gz';

			copy($load_path, $dir."/voxcels.gz");
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;
		}
	}

	private function createSeriesData($series_list, &$counter) {
		$outputPath = $this->argument('output-path');
		//シリーズデータの出力
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
	 * テンポラリデータ削除
	 * @param string $target_dir テンポラリフォルダパス
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
			array('tag', null, InputOption::VALUE_NONE, '最新リビジョンにタグ付与', null),
		);
	}

}
