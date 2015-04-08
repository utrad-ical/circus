<?php
namespace VolumeExporter;

use Series;
use Storage;
use Process;
use ZipArchive;

class Exporter
{
	public function dumperPath()
	{
		return app_path() . '/bin/dicom_voxel_dump';
	}

	public function exportOriginalVolume($series_uid, $range, $out_raw_file, $mhd_only_flg)
	{
		// Get path of DICOM files
		$sr = Series::find($series_uid);
		$path = Storage::find($sr->storageID);

		// Execute dicom_voxel_dump
		$args = array("raw", "--with-mhd");
		$args[] = "--input-path=" . escapeshellarg($path->dicomStoragePath($series_uid));
		$args[] = "--image-range=" . escapeshellarg($range);
		$args[] = "--out=" . escapeshellarg($out_raw_file);
		if ($mhd_only_flg) {
			$args[] = "--without-raw-data";
		} else {
			$args[] = "--with-tag-dump";
		}
		Process::exec($this->dumperPath() . ' ' . implode(' ', $args), $output);

		// Checking whether 'dicom_voxel_cump' command successfully executed or not
		if (count($output) > 0 && strncmp(end($output), "Succeeded", 9) !== 0) {
			throw new Exception("Failed to create original volume.");
		}
	}

	public function createLabelVolume($output_path, $label_info, $combined_flg)
	{
		$cnt = 0;
		$data = "";
		$matrix = $this->getMatrixSizeFromMetaHeader($output_path . "/original.mhd");

		$mhd_file_name = $output_path . "/label.mhd";
		$raw_file_name = $output_path . "/label.raw";

		foreach ($label_info as $label) {

			if (!$combined_flg) {
				$mhd_file_name = $output_path . "/label_" . $label['voxel_value'] . ".mhd";
				$raw_file_name = $output_path . "/label_" . $label['voxel_value'] . ".raw";
			}

			if (!$combined_flg || $cnt == 0) {
				$this->duplicateMetaHeaderForLabel(
					$output_path . "/original.mhd",
					$mhd_file_name);
				$data = str_repeat(
					chr(0),
					$matrix['width'] * $matrix['height'] * $matrix['depth']);
			}

			$im = imagecreatefrompng($label['path'] . "/" . $label['labelID'] . ".png");

			for ($k = 0; $k < $label['d']; $k++) {
				for ($j = 0; $j < $label['h']; $j++) {
					for ($i = 0; $i < $label['w']; $i++) {

						$pos_x = $i;
						$pos_y = $k * $label['h'] + $j;

						if (imagecolorat($im, $pos_x, $pos_y) == 255) {
							$volume_pos = ($label['x'] + $i)
								+ ($label['y'] + $j) * $matrix['width']
								+ ($label['z'] + $k) * $matrix['width'] * $matrix['height'];
							$data[$volume_pos] = $combined_flg ? chr($label['voxel_value']) : 1;
						}
					}
				}
			}

			if (!$combined_flg) {
				file_put_contents($raw_file_name, $data);
			}
			$cnt++;
		}

		if ($combined_flg) {
			file_put_contents($raw_file_name, $data);
		}
	}

	public function compressFilesToZip($path, $file_name)
	{
		// Get file list in $path
		$file_list = array();
		if (is_dir($path)) {
			if ($dir = opendir($path)) {
				while (($file = readdir($dir)) !== false) {
					if ($file == "." || $file == ".." || is_dir($file)) {
						continue;
					}
					$file_list[] = $file;
				}
				closedir($dir);
			}
		}

		if (count($file_list) > 0) {
			$zip = new ZipArchive();
			if ($zip->open($file_name, ZipArchive::OVERWRITE) === true) {
				foreach ($file_list as $file) {
					$zip->addFile($path . "/". $file, $file);
				}
				$zip->close();

				foreach ($file_list as $file) {
					$tmp_file_name = $path . "/". $file;
					if ($tmp_file_name != $file_name) {
						unlink($tmp_file_name);
					}
				}
			} else {
				throw new Exception("Failed to create zip file ($file_name)");
			}
		}
	}


	/**
	 * Duplicate and modify meta header file (.mhd) for label volume.
	 */
	protected function duplicateMetaHeaderForLabel($src_file_name, $dst_file_name)
	{
		$buffer = file_get_contents($src_file_name);
		$lines = explode("\r\n", $buffer);
		$path_parts = pathinfo($dst_file_name);
		$dst_data = array();

		foreach ($lines as $line) {
			if (strncmp($line, "ElementType", 11) === 0) {
				$dst_data[] = "ElementType = MET_UCHAR";
			} else if (strncmp($line, "ElementDataFile", 15) === 0) {
				$dst_data[] = "ElementDataFile = " . $path_parts['filename'] . ".raw";
			} else {
				$dst_data[] = $line;
			}
		}

		file_put_contents($dst_file_name, implode("\n", $dst_data));
	}

	protected function getMatrixSizeFromMetaHeader($file_name)
	{
		$buffer = file_get_contents($file_name);
		$lines = explode("\n", $buffer);

		foreach ($lines as $line) {
			if (preg_match('/^DimSize*\s=*\s(\d+)\s(\d+)\s(\d+)/', $line, $m)) {
				$matrix = array(
					'width'  => $m[1],
					'height' => $m[2],
					'depth'  => $m[3]);
				return $matrix;
			}
		}
		return null;
	}
}
