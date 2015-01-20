<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class ImportDicom extends Command {

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
		$registerer = new \DicomImporter\MongoRegisterer();
		$importer = new DicomImporter\Importer($registerer);
		$path = $this->argument('path');
		if (is_file($path)) {
			$importer->importOne($path);
		} elseif (is_dir($path)) {
			$this->error('Directory importing not implemented');
		} else {
			$this->error('Invalid path');
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
