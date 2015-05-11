<?php
/**
 * ラベル登録クラス
 */
class LabelRegisterController extends BaseController {
	/**
	 * Label information storage (Ajax)
	 */
	function save_label() {
		//Since there is no transaction function to MongoDB,
		//to hold to be able to delete the data of registration ID in this array
		try {
			$inputs = Input::get('data');
			$errors = $this->validateSaveLabel($inputs);

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
								$label_obj = $this->setLabel($rec2, $storage_info->storageID);
								$label_obj->save();
							}
							$save_img_result = $this->saveImage($label_obj->labelID, $rec2['image'], $storage_info->path, $label_obj->w, $label_obj->h, $label_obj->d);
							$revision[$rec['id']][] = array(
								'id'			=>	$label_obj->labelID,
								'attributes'	=>	array_key_exists('attribute', $rec2) ? $rec2['attribute'] : array()
							);
						} else {
							$revision[$rec['id']][] = array(
								'id'			=>	$rec2['id'],
								'attributes'	=>	array_key_exists('attribute', $rec2) ? $rec2['attribute'] : array()
							);
						}
					}
					$series_list[] = $this->createSeriesList($rec['id'], $revision[$rec['id']]);
				} else {
					$series_list[] = $this->createSeriesList($rec['id']);
				}
			}
			//Update of case information
			//Case information acquisition
			$case_obj = ClinicalCase::find($inputs['caseId']);

			$tmp_revision = $this->createRevision($inputs, $series_list);

			//Error checking
			$revisions = $case_obj->revisions;
			$revisions[] = $tmp_revision;
			$case_obj->revisions = $revisions;
			$case_obj->latestRevision = $tmp_revision;
			$case_obj->save();
			//JSON output
			return $this->outputJson(true, 'Registration of label information is now complete.');
		} catch (InvalidModelException $e) {
			Log::debug('InvalidModelException Error');
			Log::debug($e);
			return $this->outputJson(false, $e->getErrors());
		} catch (Exception $e){
			Log::debug('Exception Error');
			Log::debug($e);
			return $this->outputJson(false, $e->getMessage());
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
			'description'	=>	isset($inputs['memo']) ? $inputs['memo'] : '',
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
		$series_list = array(
			'seriesUID'	=>	$series_id,
			'images'	=>	Series::getImages($series_id)
		);
		if ($labels)
			$series_list['labels'] = $labels;

		return $series_list;
	}

	/**
	 * ラベル画像を保存する
	 * @param String $label_id ラベルID
	 * @param Binary $image イメージデータ
	 * @param String $path 格納先
	 * @param Integer $width 画像幅
	 * @param Integer $height 1枚当たりの画像高さ
	 * @param Integer $idx 描かれている枚数
	 * @author stani
	 * @since 2015/03/20
	 */
	function saveImage($label_id, $image, $path, $width, $height, $idx) {
		try {
			$decode_str = base64_decode($image);

			$gz_dec = zlib_decode($decode_str);
			//ドット描画準備
			ini_set('memory_limit', '-1');
			$img_obj = imagecreatetruecolor($width, $height * $idx);
			$text_color = imagecolorallocate($img_obj, 255, 255, 255);
			$background_color = imagecolorallocate($img_obj, 0, 0, 0);
			//ドット描画
			for ($i = 0; $i < strlen($gz_dec); $i++) {
				if (bin2hex($gz_dec[$i]) == '01')
					imagesetpixel($img_obj , floor($i % $width) , floor($i / $width) , $text_color);
			}
			//画像出力
			return imagepng($img_obj, $path."/".$label_id.".png");
		} catch (Exception $e) {
			Log::error($e);
			return;
		}
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
