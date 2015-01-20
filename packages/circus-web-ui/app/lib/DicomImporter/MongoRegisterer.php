<?php

namespace DicomImporter;

use MongoDate;
use Monolog\Handler\RotatingFileHandler;
use MultiRange;
use Series;
use Storage;

class MongoRegisterer extends Registerer
{
	/**
	 * @var Storage
	 */
	protected $storage;

	/**
	 * @var LoggerAdapter
	 */
	protected $logger;

	public function utilityPath()
	{
		return app_path() . '/bin/dicom_utility';
	}

	public function __construct()
	{
		$log_file = storage_path() . '/logs/dicom_import.log';
		$this->logger = new LoggerAdapter($log_file);
	}

	public function getLogger()
	{
		return $this->logger;
	}

	public function getDefaultDicomCharacterSet()
	{
		return 'UTF-8';
	}

	/**
	 * @param $path Import file path
	 * @param array $dicom_data DICOM data
	 * @return int one of STORE_RESULT_* constants
	 */
	public function storeFile($path, array $dicom_data)
	{
		$seriesUID = $dicom_data['seriesInstanceUID'];
		$sr = Series::where(array('seriesUID' => $seriesUID))->first();
		if ($sr) {
			$this->storage = Storage::where(array('storageID' => $sr->storageID))->firstOrFail();
		} else {
			$this->storage = Storage::getCurrentStorage(Storage::DICOM_STORAGE);
		}
		$dir = $this->storage->dicomStoragePath($dicom_data['seriesInstanceUID']);
		if (!is_dir($dir)) {
			mkdir($dir, 0777, true); // make directory recursively
		}
		$target = "$dir/" . $this->storage->dicomFileName($dicom_data['instanceNumber']);
		if (!copy($path, $target)) {
			$this->logger->error("Error while copying DICOM file from '$path'' to '$target'.");
			throw new ImporterException('Failed to copy the DICOM file');
		}
		return Importer::STORE_RESULT_NEW;
	}

	public function registerDatabase($path, array $dicom_data, $status)
	{
		$seriesUID = $dicom_data['seriesInstanceUID'];
		$series = Series::where(array('seriesUID' => $seriesUID))->first();

		if (is_null($series)) {
			// Insert new series
			$this->registerNewSeries($dicom_data);
		} else {
			// Update existing series
			// TODO: Lock database
			// Ensure the metadata of the new image match the existing data
			$checkKeys = array(
				'studyUID=studyInstanceUID', 'seriesDate', 'modality', 'bodyPart',
				'stationName', 'modelName'
			);
			foreach ($checkKeys as $c) {
				list($objKey, $dicomKey) = strpos($c, '=') ? explode('=', $c) : array($c, $c);
				if ($series->$objKey !== $dicom_data[$dicomKey]) {
					$this->logger->error("DICOM metadata mismatch ($dicomKey). ".
						"Imported: $series->objeKey; File: $dicom_data[$dicomKey]");
					throw new ImporterException(
						"Metadata '$dicomKey' of the new image does not match the existing data."
					);
				}
			}
			$this->updateSeries($series, $dicom_data);
			// TODO: Unlock database
		}
	}

	protected function normalizeDate($input)
	{
		if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $input, $m)) {
			return new MongoDate(strtotime($input));
			// return "$m[1]-$m[2]-$m[3]";
		}
		return null;
	}

	public function registerNewSeries(array $dicom_data)
	{
		$sr = new Series();
		$assignProperties = array(
			'studyUID=studyInstanceUID',
			'seriesUID=seriesInstanceUID',
			'width', 'height', 'seriesDate', 'modality', 'seriesDescription', 'bodyPart',
			'stationName', 'modelName', 'manufacturer'
		);
		foreach ($assignProperties as $c) {
			list($objKey, $dicomKey) = strpos($c, '=') ? explode('=', $c) : array($c, $c);
			$sr->$objKey = $dicom_data[$dicomKey];
		}
		$sr->storageID = $this->storage->storageID;
		$sr->patientInfo = array(
			'patientID' => $dicom_data['patientID'],
			'name' => $dicom_data['patientName'],
			'birthday' => $this->normalizeDate($dicom_data['birthDate']),
			'age' => (int)$dicom_data['age'],
			'sex' => strtolower($dicom_data['sex']),
			'height' => (float)$dicom_data['size'],
			'weight' => (float)$dicom_data['weight']
		);
		$sr->images = (string)$dicom_data['instanceNumber'];
		$sr->parameters = array();
		$sr->domain = 'default'; // TODO: Implement domain handling
		$sr->save();
		$this->logger->log("Inserted new series in the database. Series UID=$sr->seriesUID");
	}

	private function updateSeries($series, array $dicom_data)
	{
		$mr = new MultiRange($series->images);
		$mr->append($dicom_data['instanceNumber']);
		$series->images = $mr->__toString();
		$series->save();
		$this->logger->log("Updated series in the database. Images=$series->images; Series UID=$series->seriesUID");
	}
}

class LoggerAdapter
{
	/**
	 * @var \Monolog\Logger
	 */
	protected $logger = null;

	public function __construct($file_name)
	{
		$this->logger = new \Monolog\Logger('dicom_import');
		$this->logger->pushHandler(new RotatingFileHandler($file_name));
	}

	public function log($text)
	{
		$this->logger->log(\Monolog\Logger::INFO, $text);
	}

	public function error($text)
	{
		$this->logger->log(\Monolog\Logger::ERROR, $text);
	}
}