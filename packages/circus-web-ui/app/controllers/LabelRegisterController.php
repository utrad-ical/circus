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
		//Array for pseudo transaction
		//Since there is no transaction function to MongoDB,
		//to hold to be able to delete the data of registration ID in this array
		$transaction = array();

		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		try {
			$inputs = Input::all();
			Log::debug('保存する内容::');
			Log::debug($inputs);

			$inputs = $inputs['data'];
			$errors = self::validateSaveLabel($inputs);

			if (count($errors) > 0)
				self::errorFinish(implode("\n", $errors));

			//I want to save the label information because the error message is not
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$revision = array();
			$series_list = array();
			$img_save_path = "";

			//ラベル格納用のActiveなStorageがあるかチェック
			//ない場合は新規に作成する
			$storage_id = 0;

			$storage_info = Storage::addWhere(array('type' => 'label','active' => true))
									->get(array('storageID','path'));

			if (count($storage_info) == 0) {
				self::errorFinish("Does not exist storage for label.\nPlease register the storage from the storage management screen.");
			} else {
				$storage_id = $storage_info[0]->storageID;
				$img_save_path = $storage_info[0]->path;
			}

			foreach ($inputs['series'] as $rec) {
				$revision[$rec['id']] = array();
				//If there is a label information
				if (array_key_exists('label', $rec) !== FALSE) {
					foreach ($rec['label'] as $rec2) {
						//Register storage table and label table is not performed if there is no image
						if ($rec2['image']) {
							//すでにラベルが存在するかチェックする
							//存在する場合はラベルの登録を行わない
							$label_obj = Label::find($rec2['id']);
							if (!$label_obj) {
								//I do the registration of the label information
								//Storage ID to use the storage ID registered just before
								$label_obj = App::make('Label');
								$label_obj->labelID = $rec2['id'];	//Save as what label ID you came from client
								$label_obj->storageID = $storage_id;
								$label_obj->x = intval($rec2['offset'][0]);
								$label_obj->y = intval($rec2['offset'][1]);
								$label_obj->z = intval($rec2['offset'][2]);
								$label_obj->w = intval($rec2['size'][0]);
								$label_obj->h = intval($rec2['size'][1]);
								$label_obj->d = intval($rec2['size'][2]);
								$label_obj->creator = Auth::user()->userID;

								$errors = $label_obj->save();
								//To gain in the transaction array Now that you have registered success
								if ($errors) {
									Log::debug('[Label]Regist failed');
									self::errorFinish($errors);
									break;
								}
							}

							$decode_str = base64_decode(str_replace('data:image/png;base64,', '',$rec2['image']));
							$label_id = $label_obj->labelID;
							$file_put_result = file_put_contents($img_save_path.$label_id.".png", $decode_str);

							$revision[$rec['id']][] = array(
								'id'			=>	$label_obj->labelID,
								'attributes'	=>	array_key_exists('attribute', $rec2) ? json_decode($rec2['attribute'], true) : array()
							);
						}
					}
					$series_list[] = array(
						'seriesUID'	=>	$rec['id'],
						'images'	=>	Series::getImages($rec['id']),
						'labels'	=>	$revision[$rec['id']]
					);
				} else {
					$series_list[] = array(
						'seriesUID'	=>	$rec['id'],
						'images'	=>	Series::getImages($rec['id']),
						'labels'	=>	array()
					);
				}
			}
			//Update of case information
			//Case information acquisition
			$case_obj = ClinicalCase::find($inputs['caseId']);

			//Revision information setting
			$save_attribute = array_key_exists('attribute', $inputs) ?
								json_decode($inputs['attribute'], true) : array();
			$tmp_revision = array(
				'date'			=>	$dt,
				'creator'		=>	Auth::user()->userID,
				'description'	=>	$inputs['memo'],
				'attributes'	=>	$save_attribute,
				'status'		=>	'draft',
				'series'		=>	$series_list
			);

			//Error checking
			$revisions = $case_obj->revisions;
			$revisions[] = $tmp_revision;
			$case_obj->revisions = $revisions;
			$case_obj->latestRevision = $tmp_revision;
			$case_obj->selfValidationFails($errors);
			//Remove label information and storage information if there is an error

			$errors = $case_obj->save();

			if ($errors){
				Log::debug('Case Validate Error');
				self::errorFinish($errors);
			}
			$msg = 'Registration of label information is now complete.';
		} catch (InvalidModelException $e) {
			$error_msg = $e->getErrors();
			Log::debug('[InvalidModelException Error]'.$error_msg);
			Log::debug($e);
			self::errorFinish($error_msg);
		} catch (Exception $e){
			$error_msg = $e->getMessage();
			Log::debug('[Exception Error]'.$error_msg);
			Log::debug($e);
			self::errorFinish($error_msg);
		}
		Log::debug('Error content::'.$error_msg);

		//JSON output
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $msg, 'response' => ""));
		echo $res;
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

	/**
	 * I get the week
	 * @param $w Numeric value that represents the day of the week
	 * @return Day of the week in Japanese notation
	 */
	function getWeekDay($w) {
		$week = Config::get('const.week_day');
		return $week[$w];
	}

	/**
	 * I want to create an array for the Validate
	 * @param $data Validate checked the data
	 * @return Validate check for array
	 */
	function setCaseValidate($data) {
		$valid_ary = array();

		$valid_ary['caseID'] = $data['caseID'];
		$valid_ary['projectID'] = $data['projectID'];
		$valid_ary['patientInfoCache_patientID'] = $data['patientInfo']['patientID'];
		$valid_ary['patientInfoCache_name'] = $data['patientInfo']['patientName'];
		$valid_ary['patientInfoCache_age'] = $data['patientInfo']['age'];
		$valid_ary['patientInfoCache_sex'] = $data['patientInfo']['sex'];
		$valid_ary['patientInfoCache_birthDate'] = $data['patientInfo']['birthDate'];
		$valid_ary['date'] = new MongoDate(strtotime(date('Y-m-d H:i:s')));
		$valid_ary['incrementalID'] = 1;

		return $valid_ary;
	}

	/**
	 * Error handling of the system look back error when the message (for Ajax)
	 * @param $msg Error message
	 */
	function errorFinish($msg) {
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => false, 'message' => $msg, 'response' => ""));
		echo $res;
		exit;
	}
}
