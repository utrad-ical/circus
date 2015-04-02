<?php

use Illuminate\Console\Command;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;

class ExportVolume extends Command {

	/**
	 * The console command name.
	 *
	 * @var string
	 */
	protected $name = 'image:export-volume';

	/**
	 * The console command description.
	 *
	 * @var string
	 */
	protected $description = 'Export DICOM images or labels to volume data.';

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
		// Check mode
		$mode = $this->argument('mode');
		if ($mode != 'case' && $mode != 'series') {
			$this->error("Invalid mode (Use 'case' or 'series').");
			return;
		}

		// Check output path
		if (!is_dir($this->argument('output-path'))) {
			$this->error("Path (" . $this->argument('output-path') . ") is not found.");
			return;
		}
		// Todo: check permission

		if ($mode == 'case') {
			$this->exportCaseData();
		} else {
			$this->exportSeriesData();
		}
	}

	protected function exportCaseData()
	{
		// Check options
		if ($this->option('without-original') && $this->option('without-label')) {
			$this->error('Option error: --without-original and --without-label are simultaneously set');
			return false;
		}

		// Get case information
		$case_data = ClinicalCase::find($this->argument('targetID'));
		if ($case_data == null) {
			$this->error('Invalid caseID: ' . $this->argument('targetID'));
			return false;
		}

		// Get revision information
		$revision_index = $this->option('revision');
		$revision_data = $case_data['latestRevision'];
		if ($this->option('revision') == 'latest') {
			foreach ($case_data['revisions'] as $key => $items) {
				if ($items['date'] == $revision_data['date']) {
					$revision_index = $key;
					break;
				}
			}
		} else {
			if (array_key_exists($revision_index, $case_data['revisions'])) {
				$revision_data = $case_data['revisions'][$revision_index];
			} else {
				$this->error('Invalid revision: ' . $revision_index);
				return false;
			}
		}

		// Check series index
		$series_index = $this->option('series_index');
		if (!array_key_exists($series_index, $revision_data['series'])) {
			$this->error('Invalid series index: ' . $series_index);
			return false;
		}
		$series_data = $revision_data['series'][$series_index];

		// Check relation map (label index, voxel value)
		$map_data = null;
		// TODO: check the target series includes label data

		$map_data = $this->checkRelationMap(
			$series_data,
			$this->option('map'));
		if (!$this->option('without-label') && $map_data == null) {
			$this->error('Invalid map:');
			return false;
		}

		try {
			// Export original volume
			$ex = new \VolumeExporter\Exporter();
			$ex->exportOriginalVolume(
				$series_data['seriesUID'],
				$series_data['images'],
				$this->argument('output-path') . "/original.raw",
				$this->option('without-original'));

			// Export case_attributes.json
			if (array_key_exists('attributes', $revision_data)) {
				$file_name = $this->argument('output-path') . "/case_attributes.json";
				$attributes = array(
					'caseID' => $this->argument('targetID'),
					'revision' => $revision_index)
					+ $revision_data['attributes'];
				file_put_contents($file_name, json_encode($attributes));
			}

			// Export label volume
			if (!$this->option('without-label')) {

				// Create label info
				$label_info = array();
				$label_attributes = array(
					'caseID' => $this->argument('targetID'),
					'revision' => $revision_index
				);

				foreach ($map_data as $label_index => $voxel_value) {
					$ld = Label::find($series_data['labels'][$label_index]['id'])
						->getAttributes();
					$ld['path'] = Storage::find($ld['storageID'])->getAttribute('path');
					$ld['voxel_value'] = $voxel_value;
					$label_info[] = $ld;
					$label_attributes[$voxel_value] = $series_data['labels'][$label_index]['attributes'];
				}

				$ex->createLabelVolume(
					$this->argument('output-path'),
					$label_info,
					$this->option('combined'));

				// Export label_attributes.json
				$file_name = $this->argument('output-path') . "/label_attributes.json";
				file_put_contents($file_name, json_encode($label_attributes));
			}

			if ($this->option('without-original')) {
				unlink($this->argument('output-path') . "/original.mhd");
			}

			// Compress all exported file to ZIP file
			if ($this->option('compress')) {
				$file_name = sprintf("%s/%s_series%d_revison%d.zip",
					$this->argument('output-path'),
					$this->argument('targetID'),
					$series_index,
					$revision_index);
				$ex->compressFilesToZip($this->argument('output-path'), $file_name);
			}
		} catch (Exception $e) {
			$this->error($e);
			return false;
		}
		return true;
	}


	protected function exportSeriesData()
	{
		// Get case information
		$series_data = Series::find($this->argument('targetID'));
		if ($series_data == null) {
			$this->error('Invalid seriesUID: ' . $this->argument('targetID'));
			return false;
		}

		try {
			// Export original volume
			$ex = new \VolumeExporter\Exporter();
			$ex->exportOriginalVolume(
				$series_data['seriesUID'],
				$series_data['images'],
				$this->argument('output-path') . "/" . $series_data['seriesUID'] . ".raw",
				$this->option('without-original'));

			// Compress all exported file to ZIP file
			if ($this->option('compress')) {
				$file_name = sprintf("%s/%s.zip",
					$this->argument('output-path'),
					$series_data['seriesUID']);
				$ex->compressFilesToZip($this->argument('output-path'), $file_name);
			}
		} catch (Exception $e) {
			$this->error($e);
			return false;
		}
		return true;
	}


	protected function checkRelationMap($series_data, $map)
	{
		$results = array();

		if ($map == null) {
			$voxel_value = 1;
			foreach ($series_data['labels'] as $key => $items) {
				$results[$key] = $voxel_value++;
			}
		} else {
			$set_value_array = array();
			$relations = explode(":", $map);

			foreach ($relations as $pair) {
				$item = explode(",", $pair);

				if(!array_key_exists($item[0], $series_data['labels'])
					|| $item[1] <= 0) {
					$this->error('Invalid pairs in "--map": (' . $item[0] . ',' . $item[1] . ')');
					return null;
				} else if (in_array($item[1], $set_value_array)) {
					$this->error('Duplicate voxel value: ' . $item[1]);
					return null;
				}
				$results[$item[0]] = $item[1];
				$set_value_array[] = $item[1];
			}
		}
		return $results;
	}


	/**
	 * Get the console command arguments.
	 *
	 * @return array
	 */
	protected function getArguments()
	{
		return array(
			array('mode', InputArgument::REQUIRED, 'Process mode (case or series).'),
			array('targetID', InputArgument::REQUIRED, 'Target ID (caseID or series UID).'),
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
			array('series_index', 's', InputOption::VALUE_OPTIONAL, 'Target series index (default:0).', 0),
			array('revision', 'r', InputOption::VALUE_OPTIONAL, 'Target revision (default:latest).', 'latest'),
			array('map', 'm', InputOption::VALUE_OPTIONAL, 'Relation map between label index and voxel value.', null),
			array('combined', 'c', InputOption::VALUE_NONE, 'Combine all labels into one volume data.', null),
			array('without-original', null, InputOption::VALUE_NONE, 'Without exporting original volume.', null),
			array('without-label', null, InputOption::VALUE_NONE, 'Without exporting label volume.', null),
			array('compress', null,  InputOption::VALUE_NONE, 'Compress all exported files to ZIP.', null)
		);
	}

}
