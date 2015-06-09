<?php

use DicomImporter\Importer;
use DicomImporter\MongoRegisterer;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class ImportDicom extends TaskCommand {

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'image:import';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Import DICOM files stored in the local file system.';

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
		$registerer = new MongoRegisterer();
		$importer = new Importer($registerer);
		$counter = 1;
		$path = $this->argument('path');
		if (is_file($path)) {
			$importer->importOne($path);
			$this->info('Imported');
		} elseif (is_dir($path)) {
			if ($this->option('recursive')) {
				$dir = new RecursiveDirectoryIterator($path);
				$itr = new RecursiveIteratorIterator($dir);
			} else {
				$itr = new DirectoryIterator($path);
			}
			$files = array();
			foreach ($itr as $file) {
				if ($file->isFile()) {
					$this->updateTaskProgress($counter, 0, "Importing in progress. $counter files are processed.");
					$counter++;
					$filename = $file->getRealPath();
					$this->info($filename);
					$importer->importOne($filename);
				}
			}
		} else {
			$this->error('Invalid path');
		}
		$this->markTaskAsFinished();
	}

	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('path', InputArgument::REQUIRED, 'File or directory path to import.'),
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
			array('recursive', 'r', InputOption::VALUE_NONE, 'Import recursively.', null),
			array('anonymize', 'a', InputOption::VALUE_NONE, 'Do not register personal info.', null)
		);
	}

}
