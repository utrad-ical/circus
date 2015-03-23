<?php
/**
 * ラベル登録クラス
 */
class LabelRegisterController extends BaseController {
	/**
	 * Label information storage (Ajax)
	 */
	function save_label() {
		$error_msg = '';
		$msg = '';
		//Since there is no transaction function to MongoDB,
		//to hold to be able to delete the data of registration ID in this array
		try {
			//$inputs = Input::all();
			$inputs = Input::get('data');
			$errors = self::validateSaveLabel($inputs);

			if (count($errors) > 0)
				throw new Exception(implode("\n", $errors));

			//I want to save the label information because the error message is not
			$revision = array();
			$series_list = array();
			$img_save_path = "";

			//ストレージ情報取得
			$storage_info = Storage::getCurrentStorage(Storage::LABEL_STORAGE);
			if (!$storage_info)
				throw new Exception("Does not exist storage for label.\nPlease register the storage from the storage management screen.");

			foreach ($inputs['series'] as $rec) {
				$revision[$rec['id']] = array();
				//If there is a label information
				if (array_key_exists('label', $rec) !== false) {
					foreach ($rec['label'] as $rec2) {
						//Register storage table and label table is not performed if there is no image
						if ($rec2['image']) {
							//すでにラベルが存在するかチェックする
							//存在する場合はラベルの登録を行わない
							$label_obj = Label::find($rec2['id']);
							if (!$label_obj) {
								$label_obj = self::setLabel($rec2, $storage_info->storageID);
								$errors = $label_obj->save();

								if ($errors)
									throw new Exception($errors);
							}
							$save_img_result = self::saveImage($label_obj->labelID, $rec2['image'], $storage_info->path);
							$revision[$rec['id']][] = array(
								'id'			=>	$label_obj->labelID,
								'attributes'	=>	array_key_exists('attribute', $rec2) ? json_decode($rec2['attribute'], true) : array()
							);
						}
					}
					$series_list[] = self::createSeriesList($rec['id'], $revision[$rec['id']]);
				} else {
					$series_list[] = self::createSeriesList($rec['id']);
				}
			}
			Log::debug($series_list);
			//Update of case information
			//Case information acquisition
			$case_obj = ClinicalCase::find($inputs['caseId']);

			$tmp_revision = self::createRevision($inputs, $series_list);

			//Error checking
			$revisions = $case_obj->revisions;
			$revisions[] = $tmp_revision;
			$case_obj->revisions = $revisions;
			$case_obj->latestRevision = $tmp_revision;

			$errors = $case_obj->save();
			if ($errors)
				throw new Exception($errors);
			//JSON output
			return self::outputJson(true, 'Registration of label information is now complete.');
		} catch (InvalidModelException $e) {
			Log::debug('InvalidModelException Error');
			Log::debug($e);
			return self::outputJson(false, $e->getErrors());
		} catch (Exception $e){
			Log::debug('Exception Error');
			Log::debug($e);
			return self::outputJson(false, $e->getMessage());
		}
	}

	/**
	 * 登録結果をJson出力する
	 * @param Boolean $result 登録結果
	 * @param String $msg メッセージ
	 * @author stani
	 * @since 2015/03/20
	 */
	function outputJson($result, $msg) {
		$data = array('result' => $result, 'message' => $msg);
		return Response::json($data);
	}

	/**
	 * Revision配列を生成する
	 * @param Array $inputs 入力値
	 * @author stani
	 * @since 2015/03/20
	 */
	function createRevision($inputs, $series_list) {
		$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
		//Revision information setting
		$save_attribute = array_key_exists('attribute', $inputs) ?
							json_decode($inputs['attribute'], true) : array();
		return array(
			'date'			=>	$dt,
			'creator'		=>	Auth::user()->userID,
			'description'	=>	$inputs['memo'],
			'attributes'	=>	$save_attribute,
			'status'		=>	'draft',
			'series'		=>	$series_list
		);
	}

	/**
	 * Revision内のシリーズ配列を生成する
	 * @param String $series_id シリーズID
	 * @param Array $revision ラベル女王
	 * @author stani
	 * @since 2015/03/20
	 */
	function createSeriesList($series_id, $labels = array()) {
		return array(
			'seriesUID'	=>	$series_id,
			'images'	=>	Series::getImages($series_id),
			'labels'	=>	$labels
		);
	}

	/**
	 * ラベル画像を保存する
	 * @param String $label_id ラベルID
	 * @param Binary $image イメージデータ
	 * @param String $path 格納先
	 * @author stani
	 * @since 2015/03/20
	 */
	function saveImage($label_id, $image, $path) {
		$decode_str = base64_decode(str_replace('data:image/png;base64,', '',$image));
		return file_put_contents($path."/".$label_id.".png", $decode_str);
	}

	/**
	 * ラベル情報保存
	 * @param $data ラベル情報
	 * @param $storage_id ストレージID
	 * @author stani
	 * @since 2015/03/20
	 */
	function setLabel($data, $storage_id) {
		$label_obj = App::make('Label');
		$label_obj->labelID = $data['id'];	//Save as what label ID you came from client
		$label_obj->storageID = $storage_id;
		$label_obj->x = intval($data['offset'][0]);
		$label_obj->y = intval($data['offset'][1]);
		$label_obj->z = intval($data['offset'][2]);
		$label_obj->w = intval($data['size'][0]);
		$label_obj->h = intval($data['size'][1]);
		$label_obj->d = intval($data['size'][2]);
		$label_obj->creator = Auth::user()->userID;
		return $label_obj;
	}

	/**
	 * Label stored data simple Validate
	 * @param $data Label stored data
	 */
	function validateSaveLabel($data) {
		$error = array();
		//Case ID check
		if (!$data['caseId']) {
			$error_msg[] = 'Please set the case ID.';
		} else {
			//Case presence check
			$case_data = ClinicalCase::find($data['caseId']);
			if (!$case_data)
				$error_msg[] = $data['caseId'].'is the case ID that does not exist.';
		}

		//Series ID check
		if (count($data['series'] == 0)){
			$error_msg[] = 'Please set the series information.';
		} else {
			foreach ($data['series'] as $rec) {
				//Series ID check
				if (!$rec['id']) {
					$error_msg[] = 'Please set the series ID.';
					break;
				} else {
					//Series ID existence check
					$series_data = Series::find($rec['id']);
					if (!$series_data) {
						$error_msg[] = $rec['id'].'is the series ID that does not exist.';
						break;
					}
				}
			}
		}
		return $error;
	}
}
