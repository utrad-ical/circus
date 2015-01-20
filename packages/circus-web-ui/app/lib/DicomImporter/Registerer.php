<?php

namespace DicomImporter;

/**
 * Base class for registerers, which handle project-specific file management
 * and database registration.
 * @author Soichiro Miki <smiki-tky@umin.ac.jp>
 */
abstract class Registerer
{
	abstract public function utilityPath();

	abstract public function getLogger();

	public function needsCompression($path)
	{
		return Importer::COMPRESS_PASS;
	}

	abstract public function getDefaultDicomCharacterSet();

	/**
	 * @param $path Import file path
	 * @param array $dicom_data DICOM data
	 * @return int one of STORE_RESULT_* constants
	 */
	abstract public function storeFile($path, array $dicom_data);

	abstract public function registerDatabase($path, array $dicom_data, $status);
}

