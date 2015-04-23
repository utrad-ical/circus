<?php

/**
 * Series registration controller
 */
class SeriesRegisterController extends BaseController {
	/**
	 * Series registration screen
	 */
	public function import()
	{
		return View::make('series.input')
			->with('max_filesize', ini_get('upload_max_filesize'));
	}

	/**
	 * Actual registration (AJAX)
	 */
	public function register()
	{
		try {
			// delete old temporary files
			CommonHelper::deleteOlderTemporaryFiles(storage_path('uploads'), true, '-1 day');

			// Acquire information on the upload files
			$uploads = Input::file('files');
			if (!is_array($uploads)) throw new Exception('Upload files not specified.');

			$targets = array();
			$auth_sess_key = Auth::getSession()->getId();
			$tmp_dir = storage_path('uploads/' . $auth_sess_key);

			foreach ($uploads as $upload) {
				$ext = strtolower($upload->getClientOriginalExtension());
				$target = "$tmp_dir/" . $upload->getClientOriginalName();
				if ($ext == 'zip') {
					// Extract the zip file into a temp dir and import it later
					$this->thawZip($upload, $target);
					$targets[] = $target;
				} else {
					// Import a single DICOM file
					$upload->move($tmp_dir, $upload->getClientOriginalName());
					$targets[] = $target;
				}
			}
			// invoke artisan command to import files
			foreach ($targets as $target) {
				Log::debug(['IMPORT', $target]);
				Artisan::call('image:import', array('path' => $target, '--recursive' => true));
			}

			Session::forget('edit_case_id'); // TODO: Do we really need this?

			return Response::json(array(
				'result' => true,
				'targets' => $targets
			));
		} catch (Exception $e) {
			Log::info('[' . get_class($e) . ']');
			Log::info($e);
			return Response::json(
				array('result' => false, 'errorMessage' => $e->getMessage()),
				400
			);
		}
	}

	/**
	 * Extract a zip file.
	 * @param string $file Path to zip file
	 * @return string Extracted folder path
	 */
	protected function thawZip($file, $dir)
	{
		$zip = new ZipArchive();
		$res = $zip->open($file);
		if ($res !== true)
			throw new Exception("Error while extracting the zip file. [Error Code $res]");
		$zip->extractTo($dir);
		$zip->close();
	}

}
