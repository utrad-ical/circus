<?php
/**
 * Class to perform the operation of series
 * @since 2014/12/09
 */
class SeriesController extends BaseController {
	/**
	 * Series Search Result
	 * @since 2014/12/09
	 */
	public function search() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initialization
		$search_flg = true;
		$result = array();

		//Input value acquisition
		$inputs = Input::all();

		//Reset or initial display button is pressed during
		if (array_key_exists ('btnReset', $inputs) !== FALSE || !$inputs) {
			$search_flg = false;
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
		}

		//Search
		if ($search_flg) {
			$search_data = Session::get('series.search');
			//Search conditions generation and data acquisition
			//Setting of acquisition column
			$select_col = array(
				'seriesUID', 'seriesDescription',
				'patientInfo.patientID', 'patientInfo.patientName',
				'patientInfo.sex', 'patientInfo.birthday'
			);

			//Total number acquisition
			$series_count = Serieses::addWhere($search_data)
									->count();

			//Search result acquisition
			$series_list = Serieses::addWhere($search_data)
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
			$result['inputs'] = $search_data;
		}

		$result['title'] = 'Series Search';
		$result['url'] = 'series/search';
		$result['search_flg'] = $search_flg;
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		return View::make('series/search', $result);
	}

	/**
	 * Series detail page
	 * @since 2014/12/11
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


		if (!$inputs['seriesUID']) {
			$error_msg = 'Please specify the series ID.';
		}

		if (!$error_msg) {
			//Check series ID that exists
			$series_data = Serieses::find($inputs['seriesUID']);
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
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 * @since 2014/12/04
	 */
	function cssSetting($screen = 'search') {
		$css = array();

		if ($screen == 'detail') {
			$css['page.css'] = 'css/page.css';
			$css['ui-lightness/jquery-ui-1.10.4.custom.min.css'] = 'css/ui-lightness/jquery-ui-1.10.4.custom.min.css';
		}
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 * @since 2014/12/04
	 */
	function jsSetting($screen = 'search') {
		$js = array();
		$js['jquery.cookie.js'] = 'js/jquery.cookie.js';

		if ($screen == 'detail'){
			$js['img_edit.js'] = 'js/img_edit.js';
		}
		return $js;
	}

	/**
	 * Get the gender for display
	 * @param $sex Gender of value
	 * @return Gender display string
	 * @since 2014/12/12
	 */
	function getSex($sex) {
		$sexes = Config::get('const.patient_sex');
		return $sexes[$sex];
	}
}
