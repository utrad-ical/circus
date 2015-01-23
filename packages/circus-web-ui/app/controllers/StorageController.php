<?php
/**
 * Class to perform the operation of storage
 */
class StorageController extends BaseController {
	/**
	 * Storage results
	 */
	public function search() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Session discarded
		Session::forget('storage_input');
		Session::forget('StorageID');

		//Input value acquisition
		$inputs = Input::all();

		//Data acquisition
		//Setting of acquisition column
		$select_col = array('storageID', 'path', 'type', 'active');

		//Total number acquisition
		$storage_count = Storage::count();

		//Search result acquisition
		$dicom_storage_list = Storage::addWhere(array('type' => 'dicom'))
										->orderby('updateTime', 'desc')
										->get($select_col);
		$label_storage_list = Storage::addWhere(array('type' => 'label'))
										->orderby('updateTime', 'desc')
										->get($select_col);
		$result['title'] = 'Storage';
		$result['url'] = 'admin/storage/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
//		$result['storage_list'] = $storage_list;
		$result['dicom_storage_list'] = $dicom_storage_list;
		$result['label_storage_list'] = $label_storage_list;
		$result['inputs'] = array();

		return View::make('admin/storage/search', $result);
	}

	/**
	 * Storage registration input(Ajax)
	 */
	public function input() {
		Log::debug("input called");
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		try{
		$result = array();
		$result['url'] = '/admin/storage/search';

		//Input value acquisition
		$inputs = Input::all();

		//Settings page
		if (array_key_exists('btnBack', $inputs)) {
			$result['inputs'] = Session::get('storage_input');
		} else {
			$result['inputs'] = array('storageID' => Seq::getIncrementSeq('Storages'));
			Session::put('mode', 'Add new');
		}

		//Setting of title
		$mode = Session::get('mode');
		$result['title'] = $mode.' Storage';

		//I hold the storage information in the session
		Session::put('storage_input', $result['inputs']);
		//$result['storage_detail'] = $result['inputs'];

		$tmp = View::make('/admin/storage/input', $result);
		Log::debug($result);
		Log::debug($tmp);
		} catch(Exception $e){
			Log::debug($e->getMessage());
		}
		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Storage registration confirm
	 */
	public function confirm() {
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		$mode = Session::get('mode');

		//Input value acquisition
		$inputs = Input::all();
		$storage_data = Session::get('storage_input');
		$inputs['storageID'] = $storage_data['storageID'];
		$inputs['active'] = isset($inputs['active']) ? $inputs['active'] : false;
		Session::put('storage_input', $inputs);

		$result['inputs'] = $inputs;
		Log::debug($inputs);

		//Session information acquisition
		$storageID = Session::get('storageID');

		//Validate check for object creation
		$storage_obj = $storageID ?
						Storage::find($storageID) :
						App::make('Storage');

		//Set the value for the Validate check
		$storage_obj->storageID = $inputs['storageID'];
		$storage_obj->path = $inputs['path'];
		$storage_obj->type = isset($inputs['type']) ? $inputs['type'] : '';
		$storage_obj->active = $inputs['active'];

		//ValidateCheck
		$errors = $storage_obj->validate($inputs);
		Log::debug($errors);

		//Processing in the case where there is an error
		if ($errors) {
			$result['title'] = $mode.' Storage';
			$result['url'] = '/admin/storage/input';
			$result['errors'] = $errors;
			$tmp = View::make('/admin/storage/input', $result);
		} else {
			//Processing in the case where there is no error
			$result['title'] = $mode.' Storage Confirmation';
			//And displays a confirmation screen because there is no error
			$result['url'] = '/admin/storage/confirm';
			$tmp = View::make('/admin/storage/confirm', $result);
		}
		Log::debug($result);
		Log::debug($tmp);

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Storage registration
	 */
	public function register(){
		//Login check
		if (!Auth::check()) {
			//Forced redirected to the login screen because not logged in
			return Redirect::to('login');
		}

		//Initial setting
		$result = array();

		//Information obtained from the session
		$inputs = Session::get('storage_input');
		$storageID = Session::get('storageID');
		$mode = Session::get('mode');

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Validate check for object creation
		$storage_obj = $storageID ?
						Storage::find($storageID) :
						App::make('Storage');
		//Set the value for the Validate check
		$storage_obj->storageID = $inputs['storageID'];
		$storage_obj->path = $inputs['path'];
		$storage_obj->type = $inputs['type'];
		$storage_obj->active = $inputs['active'];

		//ValidateCheck
		$errors = $storage_obj->validate($inputs);

		if (!$errors) {
			//Validate process at the time of success
			//I registered because there is no error
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$storage_obj->updateTime = $dt;
			$storage_obj->createTime = $dt;
			$storage_obj->save();

			$result['url'] = '/admin/storage/complete';
			$result['msg'] = 'Registration of storage information is now complete.';
			$result['storageID'] = $inputs['storageID'];
			$result['title'] = $mode.' Storage Complete';

			//Session discarded
			Session::forget('storage_input');
			Session::forget('storageID');
			Session::forget('mode');

			$tmp = View::make('/admin/storage/complete', $result);
		} else {
			//Process at the time of Validate error
			$result['errors'] = $errors;
			$result['inputs'] = $inputs;
			$result['title'] = $mode.' Storage';
			$result['url'] = '/admin/storage/input';
			$tmp = View::make('/admin/storage/input', $result);
		}

		header('Content-Type: application/json; charset=UTF-8');
		$res = json_encode(array('result' => true, 'message' => '', 'response' => "$tmp"));
		echo $res;
	}

	/**
	 * Page individual CSS setting
	 * @return Page individual CSS configuration array
	 */
	public function cssSetting() {
		$css = array();
		$css['page.css'] = 'css/page.css';
		$css['color.css'] = 'css/color.css';
	  	return $css;
	}

	/**
	 * Page individual JS setting
	 * @return Page individual JS configuration array
	 */
	public function jsSetting() {
		$js = array();
		return $js;
	}
}
