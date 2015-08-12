<?php
namespace DicomAnonymizer;

use Series;
use Storage;
use Process;
use MultiRange;

class Anonymizer
{
	public function utilityPath()
	{
		return app_path() . '/bin/dicom_utility';
	}

	public function anonymizeDicomFiles($series_uid, $out_path)
	{
		// Get path of DICOM files
		$sr = Series::find($series_uid);
		$src_path = Storage::find($sr->storageID);


		if ($src_path == $out_path) {
			throw new \Exception("Failed to create original volume.");
		}

		$mr = new MultiRange($sr['images']);
		$mr->rewind();

		// Execute dicom_utility (anonymize mode)
		while ($mr->current() !== false)
		{
			$src_file = sprintf("%s/%08d.dcm",
							$src_path->dicomStoragePath($series_uid),
							$mr->current());
			$out_file = sprintf("%s/%08d.dcm",
							$out_path,
							$mr->current());

			$args = array("anonymize");
			$args[] = "--out=" . escapeshellarg($out_file);
			$args[] = escapeshellarg($src_file);
			Process::exec($this->utilityPath() . ' ' . implode(' ', $args));

			$mr->next();
		}
	}
}
