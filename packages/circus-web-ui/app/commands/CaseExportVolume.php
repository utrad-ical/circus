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
			$this->error('Export対象のケースを選択してください。');
			return;
		}

		$outputPath = $this->argument('output-path');
		if (!$outputPath) {
			$this->error('出力先フォルダーを指定してください。');
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

		Log::debug('explode前::');
		Log::debug($this->argument('cases'));
		Log::debug('caseID一覧::');
		Log::debug($caseIds);
		Log::debug('出力先');
		Log::debug($outputPath);

		try {
			foreach ($caseIds as $caseId) {
				$case_data = ClinicalCase::find($caseId);

				if ($case_data == null) {
					$this->error('Invalid caseID: ' . $caseId);
					return false;
				}

				Log::debug('ケース情報::');
				Log::debug($case_data->toArray());

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
						foreach ($series['labels'] as $label) {
							$label_data = Label::find($label['id']);
							if (!$label_data)
								throw new Exception('ラベルID['.$label['id'].'のラベルデータがありません。');

							$dir = $outputPath. "/cases/".$caseId."/labels/".$label['id'];
							if (!is_dir($dir)) {
								mkdir($dir, 0777, true); // make directory recursively
							}
							//ラベルJSON
							$file_name = $dir . '/label.json';
							file_put_contents($file_name, json_encode($case_data));
							$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
							$counter++;

							//ラベルファイル
							$storage_info = Storage::find($label_data->storageID);
							$storage_path = $storage_info->path;

							$load_path = $storage_path."/".$label['id'].'.gz';

							copy($load_path, $dir."/voxcels.gz");
						}
					}
				}
			}

			//シリーズデータの出力
			foreach ($series_list as $series) {
				$series_data = Series::find($series);
				if (!$series_data)
					throw new Exception('シリーズID['.$series.'が存在しません。');

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
				        }
				    }
			    	closedir($dicom_dir);
				}

				file_put_contents($file_name, json_encode($case_data));
				$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
				$counter++;
			}

			//TarGz圧縮
			//TODO::あとでちゃんとしたファイル名に変える
			exec("tar zcvfr ".$outputPath."/data.tar.gz ".$outputPath, $output, $ret);
			Log::debug('圧縮結果::');
			Log::debug($ret);
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			$counter++;

			/*
			TODO::圧縮成功してからこのコメントアウト解除する
			unlink($outputPath."/export.tar");

			//圧縮が完了したのでtar.gz以外のファイルを削除する
			$this->deleteTemporaryFiles($outputPath);
			$this->updateTaskProgress($counter, 0, "Exporting in progress. $counter files are processed.");
			*/
		} catch (Exception $e) {
			\Log::debug('エラー発生');
			\Log::error($e);
			\Log::info($e->getMessage());
			return false;
		}
		return true;
	}

	/**
	 * テンポラリデータ削除
	 * @param string $target_dir テンポラリフォルダパス
	 */
	public static function deleteTemporaryFiles($target_dir)
	{
		if (!File::isDirectory($target_dir)) return false;

		$items = new FilesystemIterator($target_dir);

		foreach ($items as $item) {
			if ($item->isDir()) {
				self::deleteTemporaryFiles($item->getPathname());
			} else if ($item->getFilename() != ".gitignore") {
				$file_name = $item->getPathname();
				$ext = pathInfo($file_name, PATHINFO_EXTENSION);
				if ($ext !== 'tar.gz')
					File::delete($file_name);
			}
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
