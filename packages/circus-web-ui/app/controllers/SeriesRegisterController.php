<?php
class ZipException extends \Exception{
}
/**
 * シリーズ登録
 */
class SeriesRegisterController extends BaseController {
	/**
	 * Series registration screen
	 */
	function input(){
		return View::make('series.input');
	}

	/**
	 * Series registration
	 */
	function register(){
		//POST data acquisition
		$inputs = Input::all();

		try {
			//delete temporary files
			CommonHelper::deleteOlderTemporaryFiles(storage_path('uploads'), true, '-1 day');

			//Not selected file
			if (array_key_exists('upload_file', $inputs) === false)
				throw new Exception('Please select the file.');

			//Upload file information acquisition
			$uploads = Input::file('upload_file');
			$file_list = array();

			foreach ($uploads as $upload) {
				$res = $upload->move(storage_path('uploads')."/", $upload->getClientOriginalName());

				//If extension of Zip to save unzip
				$ext = $upload->getClientOriginalExtension();

				if ($ext == 'zip'){
					$file_list[] = $this->thawZip($upload->getClientOriginalName(), $errorMsg);
					if ($errorMsg)
						throw new ZipException($errorMsg);
				} else {
					//image:import
					$file_list[] = storage_path('uploads')."/".$upload->getClientOriginalName();
				}
			}
			//Dicomファイルインポート
			foreach ($file_list as $file_path) {
				Artisan::call('image:import', array("path" => $file_path));
			}

			return Redirect::to('series/complete')
			               ->with('msg', 'Registration of series information is now complete.');
		} catch (ZipException $e) {
			Log::debug('[ZipException]');
			Log::debug($e);
			return $this->errorFinish($e->getMessage());
		} catch (InvalidModelException $e) {
			Log::debug('[InvalidModelException]');
			Log::debug($e);
			return $this->errorFinish($e->getErrors());
		} catch (Exception $e) {
			Log::debug('[Exception]');
			Log::debug($e);
			return $this->errorFinish($e->getMessage());
		}
	}

	/**
	 * Zipを解凍し保存する
	 * @param $file ZIPファイル名
	 * @param $error_msg エラーメッセージ
	 * @return Zip解凍フォルダパス
	 * @author stani
	 * @since 2015/03/20
	 */
	function thawZip($file, &$error_msg) {
		try {
			$zip = new ZipArchive();
			//Zip file open
			$zip_path = storage_path('uploads')."/".$file;
			$res = $zip->open($zip_path);

			//Successful Zip file open
			if ($res !== true)
				throw new Exception("Upload Failed.[Error Code ".$res."]");

			//To save Unzip all the files in the Zip file
			//Unzip the folder name I keep the file name
			$zip->extractTo(storage_path('uploads'));
			//Zip file close
			$zip->close();

			//Zip解凍フォルダパスを格納
			return mb_substr($zip_path, 0, mb_strlen($zip_path)-4);
		} catch (Exception $e) {
			$error_msg = $e->getMessage();
		}
	}

	/**
	 * エラー時処理
	 * @param $errMsg エラーメッセージ
	 * @author stani
	 * @since 2015/03/20
	 */
	function errorFinish($errMsg) {
		return View::make('series.input', array('error_msg' => $errMsg));
	}

	/**
	 * Series registration completion screen
	 */
	function complete(){
		//Session information acquisition
		$result = array();
		$result['msg'] = Session::get('msg');

		if (Session::has('edit_case_id'))
			Session::forget('edit_case_id');

		//Screen display
		return View::make('series.complete', $result);
	}
}
