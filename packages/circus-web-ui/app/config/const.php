<?php
//共通の定数定義はこのファイル内で行う
return array(
	'page_display'			=>	50,	//デフォルトの検索結果1ページ表示件数
	'patient_sex'			=>	array('M' => 'male', 'F' => 'female', 'O' => 'other'),	//表示用:患者性別
	'search_display'		=>	array('' => 'display_num', 10 => 10, 50 => 50, 100 => 100, 'all' => 'all'),	//検索結果表示件数
	'search_case_sort'		=>	array('' => 'Sort Order', 'updateTime' => 'Last Update', 'caseID' => 'ID'),	//ケース検索ソート
	'search_sort'	=>	array('desc' => 'desc', 'asc' => 'asc'),	//検索昇順/降順
	'week_day'				=>	array('日', '月', '火', '水', '木', '金', '土'),	//曜日(日本語表記)
	'search_series_sort'	=>	array('' => 'Sort Order', 'patientInfo.patientID' => 'patientID',
									  'patientInfo.patientName' => 'patientName', 'patientInfo.age' => 'age',
									  'patientInfo.sex' => 'sex', 'seriesDate' => 'seriesDate',
									  'modality' => 'modality', 'seriesDescription' => 'seriesDescription'),	//シリーズ検索ソート
	'hash_key'				=>	'todai_test',
	'crypt_secret_key'		=>	'todai_project',
	'upload_path'			=>	dirname(dirname(dirname(__FILE__))).'/public/uploads/',
	'label_img_save_path'	=>	dirname(dirname(__FILE__)).'/storage/labelImage/'
);