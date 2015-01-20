<?php
/**
 * Class to perform the operation of series
 */
class SeriesController extends BaseController {
	/**
	 * Series Search Result
	 */
	public function search() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initialization
		$search_flg = false;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		//Reset or initial display button is pressed during
		if (array_key_exists ('btnReset', $inputs) !== FALSE || !$inputs) {
			Session::forget('series.search');
			$result['inputs'] = array('sex' => 'all');
		//Search button is pressed during
		} else if (array_key_exists('btnSearch', $inputs) !== FALSE) {
			if (array_key_exists ('disp', $inputs) === FALSE) $inputs['disp'] = Config::get('const.page_display');
			if (array_key_exists ('sort', $inputs) === FALSE) $inputs['sort'] = 'updateTime';
			Session::put('series.search', $inputs);
		} else if (array_key_exists('page', $inputs) !== FALSE) {
			$tmp = Session::get('series.search');
			$tmp['perPage'] = $inputs['page'];
			Session::put('series.search', $tmp);
		} else if (array_key_exists('condition_id', $inputs) !== FALSE){
			$detail_search_session = Session::get('series_detail_search');
			$detail_search = $detail_search_session[$inputs["condition_id"]];
			$detail_search['disp'] = Config::get('const.page_display');
			$detail_search['sort'] = 'updateTime';
			Session::put('series.search', $detail_search);
		}

		$search_data = Session::get('series.search');

		//Search
		if ($search_data) {
			$search_flg = true;
			//Search conditions generation and data acquisition
			//Setting of acquisition column
			$select_col = array(
				'seriesUID', 'seriesDescription',
				'patientInfo.patientID', 'patientInfo.patientName',
				'patientInfo.sex', 'patientInfo.birthday'
			);

			//Total number acquisition
			$series_count = Series::addWhere($search_data)
									->count();

			//Search result acquisition
			$series_list = Series::addWhere($search_data)
									->orderby($search_data['sort'], 'desc')
									->addLimit($search_data)
									->get($select_col);
			$query_log = DB::getQueryLog();

			//The formatting for display
			$list = array();
			foreach($series_list as $rec) {
				//Patient information
				$patient = $rec->patientInfo;

				//I shaping for display
				$list[] = array(
					'seriesID'			=>	$rec->seriesUID,
					'seriesDescription'	=>	$rec->seriesDescription,
					'patientID'			=>	$patient['patientID'],
					'patientName' 		=>	$patient['patientName'],
					'patientBirthday'	=>	$patient['birthday'],
					'patientSex'		=>	self::getSex($patient['sex'])
				);
			}
			$result['list'] = $list;

			//Setting the pager
			$case_pager = Paginator::make(
				$list,
				$series_count,
				$search_data['disp']
			);
			$result['list_pager'] = $case_pager;
		} else {
			//Default configuration
			$search_data['sex'] = 'all';
		}

		$result['inputs'] = $search_data;

		$result['title'] = 'Series Search';
		$result['url'] = 'series/search';
		$result['search_flg'] = $search_flg;
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('series/search', $result);
	}

	/**
	 * Search conditions save(Ajax)
	 */
	public function save_search() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$search_flg = false;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		//I want to save your search criteria in the session
		if (Session::has('series_detail_search')) {
			$save_series_search = Session::get('series_detail_search');
			$before_cnt = count($save_series_search);
			array_push($save_series_search, $inputs);
			Session::put('series_detail_search', $save_series_search);
		} else {
			Session::put('series_detail_search', array($inputs));
			$before_cnt = 0;
		}

		$after_cnt = count(Session::get('series_detail_search'));

		if ($before_cnt+1 === $after_cnt) {
			$msg = 'Save search criteria has been completed.';
		} else {
			$msg = 'I failed to save the search criteria.';
		}
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => $msg));
		echo $res;
	}

	/**
	 * Series list acquisition
	 * Nodeが直接とれるようになったら不要になので削除予定
	 */
	function get_series() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}
		try {
			$file_path = dirname(dirname(__FILE__))."/config/testing/sample.json";
			$handle = fopen($file_path, 'r');
			$data = fread($handle, filesize($file_path));
			fclose($handle);
		} catch (Exception $e){
			Log::debug($e->getMessage());
		}

		$data = $data ? $data : json_encode(array("msg"=>"error"));
		header('Content-Type: application/json; charset=UTF-8');
		echo $data;
	}

	/**
	 * Series detail page
	 */
	function detail() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$error_msg = '';
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		if (array_key_exists('btnBack', $inputs) !== FALSE) {
			//ID retrieved from the session
			$cases = Session::get('case_input');
			$ids = array_keys($cases['series_list']);
			$inputs['seriesUID'] = $ids[0];
			//Session discarded
			Session::forget('case_input');
		} else if (!$inputs['seriesUID']) {
			$error_msg = 'Please specify the series ID.';
		}

		if (!$error_msg) {
			//Check series ID that exists
			$series_data = Series::find($inputs['seriesUID']);
			if (!$series_data) {
				$error_msg = 'Series ID does not exist.';
			}
		}

		//I want to display the case detailed information if there is no error message
		if (!$error_msg) {
			//And shape the series information for display
			$series_detail = array(
				'seriesUID'			=>	$series_data->seriesUID,
				'patientID'			=>	$series_data->patientInfo['patientID'],
				'patientName'		=>	$series_data->patientInfo['patientName'],
				'patientBirthday'	=>	$series_data->patientInfo['birthday'],
				'patientSex'		=>	$series_data->patientInfo['sex'],
				'LastUpdate'		=>	date('Y/m/d h:i', $series_data->updateTime->sec),
				'creator'			=>	$series_data->receiveMethod,
				'seriesDescription'	=>	$series_data->seriesDescription
			);
			$result['series_detail'] = $series_detail;
		} else {
			$result['error_msg'] = $error_msg;
		}

		$result['title'] = 'Series Detail';
		$result['url'] = 'series/detail';
		$result['css'] = self::cssSetting('detail');
		$result['js'] = self::jsSetting();
		return View::make('/series/detail', $result);
	}

	/**
	 * Series registration screen
	 */
	function input(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		$result['title'] = 'Series Import';
		$result['url'] = 'series/input';
		$result['css'] = self::cssSetting('input');
		$result['js'] = self::jsSetting();

		return View::make('/series/input', $result);
	}

	/**
	 * Series registration
	 */
	function register(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Error message initialization
		$error_msg = '';
		$result = array();

		//POST data acquisition
		$inputs = Input::all();

		//Not selected file
		if (array_key_exists('upload_file', $inputs) === FALSE) {
			$error_msg = "Please select the file.";
		} else {
			//Upload file information acquisition
			$uploads = Input::file('upload_file');

			try{
				foreach ($uploads as $upload) {
					$upload_dir = dirname(dirname(__FILE__)).'/storage/uploads';
					$res = $upload->move($upload_dir, $upload->getClientOriginalName());

					//If extension of Zip to save unzip
					$ext = $upload->getClientOriginalExtension();

					if ($ext == 'zip'){
						$zip = new ZipArchive();
						//Zip file open
						$zip_path = $upload_dir."/".$upload->getClientOriginalName();
						$res = $zip->open($zip_path);

						//Successful Zip file open
						if ($res === true){
							//To save Unzip all the files in the Zip file
							//Unzip the folder name I keep the file name
							$zip->extractTo($upload_dir);
							//Zip file close
							$zip->close();
						} else {
							$error_msg = "Upload Failed.[Error Code ".$res."]";
						}
					}
				}
			} catch (Exception $e){
				$error_msg = $e->getMessage();
				Log::debug("[Exception Error]".$error_msg);
			}
		}

		if ($error_msg) {
			//Processing in the case where there is an error
			$result['title'] = 'Series Import';
			$result['url'] = '/series/import';
			$result['css'] = self::cssSetting('input');
			$result['js'] = self::jsSetting();
			$result['error_msg'] = $error_msg;
			return View::make('/series/input', $result);
		} else {
			//Processing in the case where there is no error
			$result['title'] = 'Series Import Complete';
			$result['url'] = '/series/complete';
			$result['css'] = self::cssSetting();
			$result['js'] = self::jsSetting();
			$result['msg'] = 'Registration of series information is now complete.';
			Session::put('complete', $result);
			return Redirect::to('/series/complete');
		}
	}

	/**
	 * Series registration completion screen
	 */
	function complete(){
		//Session information acquisition
		$result = Session::get('complete');

		//Session information discarded
		Session::forget('complete');

		//Screen display
		return View::make('series/complete', $result);
	}

	/**
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 */
	function cssSetting($screen = 'search') {
		$css = array();

		switch ($screen) {
			case 'detail':
			case 'input':
				$css['page.css'] = 'css/page.css';
				$css['ui-lightness/jquery-ui-1.10.4.custom.min.css'] = 'css/ui-lightness/jquery-ui-1.10.4.custom.min.css';
				break;
			case 'search':
				break;
		}
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 */
	function jsSetting($screen = 'search') {
		$js = array();

		switch ($screen) {
			case 'search':
				$js['jquery.cookie.js'] = 'js/jquery.cookie.js';
				break;
			case 'detail':
				$js['jquery.cookie.js'] = 'js/jquery.cookie.js';
				$js['img_edit.js'] = 'js/img_edit.js';
				$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
				break;
			case 'input':
				break;
		}
		return $js;
	}

	/**
	 * Get the gender for display
	 * @param $sex Gender of value
	 * @return Gender display string
	 */
	function getSex($sex) {
		$sexes = Config::get('const.patient_sex');
		return $sexes[$sex];
	}

	/**
	 * I set to an array for Validate analyzes the uploaded file
	 * アップロードされる形式等の詳細が不明なため、枠だけ作成
	 * @param $input Input value
	 * @return Validate for array
	 */
	function setSeriesValidate($input){
		$list = array();

		//ここに設定値
		return $list;
	}
}
