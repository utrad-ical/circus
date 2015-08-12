<?php

use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class AnonymizeDicom extends TaskCommand {

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'image:anonymize';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Anonymize DICOM files to export.';

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
		// Check output path
		if (!is_dir($this->argument('output-path'))) {
			$this->error("Path (" . $this->argument('output-path') . ") is not found.");
			return false;
		}

		// Todo: check permission

		// Get series information
		$series_data = Series::find($this->argument('targetID'));
		if ($series_data == null) {
			$this->error('Invalid seriesUID: ' . $this->argument('targetID'));
			return false;
		}

		$anon = new \DicomAnonymizer\Anonymizer();
		$anon->anonymizeDicomFiles($this->argument('targetID'), $this->argument('output-path'));

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
			array('targetID', InputArgument::REQUIRED, 'Target series UID.'),
			array('output-path', InputArgument::REQUIRED, 'Output path.')
		);
	}

	/**
	 * Get the console command options.
	 *
	 * @return array
	 */
	//protected function getOptions()
	//{
	//}

}
