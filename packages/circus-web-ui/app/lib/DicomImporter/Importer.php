<?php

namespace DicomImporter;

use Process;

class ImporterException extends \Exception
{

}

class Importer
{
	/**
	 * Specifies that the target DICOM file is saved as-is,
	 * without compression status being changed.
	 */
	const COMPRESS_PASS = 0;

	/**
	 * Specifies that the target DICOM file must be always compressed.
	 */
	const COMPRESS_YES = 1;

	/**
	 * Specifies that the target DICOM file must be always decompressed.
	 */
	const COMPRESS_NO = 2;

	/**
	 * The DICOM files was newly inserted.
	 */
	const STORE_RESULT_NEW = 0;

	/**
	 * A pre-existing DICOM file was overwritten.
	 */
	const STORE_RESULT_OVERWRITE = 1;

	/**
	 * There was pre-existing DICOM file, so the file was not stored.
	 */
	const STORE_RESULT_SKIP = 2;

	/**
	 * Default character set to dump DICOM tag values.
	 */
	const DEFAULT_DICOM_CHARACTER_SET = 'utf8';

	/**
	 * @var Registerer
	 */
	protected $_registerer = null;

	public function __construct($registerer)
	{
		$this->_registerer = $registerer;
	}

	static $oveerridable = array(
		'patientName' => '/^[A-Za-z0-9\\^]{1,255}$/',
		'patientID' => '/^[A-Za-z0-9\\-_]{1,255}$/',
	);

	public function importOne($path, array $overrides = array())
	{
		try {
			if (!file_exists($path)) {
				throw new ImporterException('The specified file does not exist.');
			}

			$workfile = tempnam(sys_get_temp_dir(), 'dcm');
			if (!copy($path, $workfile)) {
				throw new ImporterException('Error while preparing DICOM file ' .
					'into temporary directory');
			}

			// Execute dicom_utility and create tag dump JSON file
			$args = array('modify', '--dump');
			$compress = $this->_registerer->needsCompression($workfile);
			if ($compress == self::COMPRESS_YES) $args[] = '--compress';
			if ($compress == self::COMPRESS_NO) $args[] = '--decompress';
			$characterSet = $this->_registerer->getDefaultDicomCharacterSet();
			if($characterSet != self::DEFAULT_DICOM_CHARACTER_SET) {
				$args[] = '--character-set=' . escapeshellarg($characterSet);
			}
			foreach ($overrides as $key => $value) {
				if (isset(self::$oveerridable[$key])) {
					if (preg_match(self::$oveerridable[$key], $value)) {
						$args[] = "--set-tag=$key," . escapeshellarg($value);
					}
				}
			}
			$args[] = escapeshellarg($workfile);
			Process::exec($this->_registerer->utilityPath() . ' ' . implode(' ', $args));

			$json_file = preg_replace('/\\.tmp$/', '.json', $workfile);
			if (!file_exists($json_file)) {
				throw new ImporterException('Error while creating DICOM dump JSON file.');
			}
			$dicom_data = json_decode(file_get_contents($json_file), true);
			unlink($json_file);
			if (!is_array($dicom_data) || !isset($dicom_data['transferSyntaxUID'])) {
				throw new ImporterException('Could not read or parse DICOM dump JSON file.');
			}
			if (isset($dicom_data['unsupportedMessage'])) {
				throw new ImporterException('This DICOM file is not supported: ' .
					$dicom_data['unsupportedMessage']);
			}

			$this->importFileWithData($workfile, $dicom_data);

			// Remove temporary DICOM file
			unlink($workfile);

			$this->_registerer->getLogger()
				->log(sprintf('Imported: %s', $path));
			return true;
		} catch (ImporterException $e) {
			if (isset($workfile) && file_exists($workfile)) {
				unlink($workfile);
			}
			$this->_registerer->getLogger()->error($e->getMessage() . ": $path");
			throw $e;
		}
	}

	public function importFileWithData($dicom_file, array $dicom_data)
	{
		// Store the target DICOM file to the persistent storage area
		$status = $this->_registerer->storeFile($dicom_file, $dicom_data);
		// Register the DICOM information to database
		$this->_registerer->registerDatabase($dicom_file, $dicom_data, $status);
	}
}

