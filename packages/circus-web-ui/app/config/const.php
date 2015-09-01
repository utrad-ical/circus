<?php
//共通の定数定義はこのファイル内で行う
return array(
	'page_display'			=>	50,	//デフォルトの検索結果1ページ表示件数
	'patient_sex'			=>	array('M' => 'male', 'F' => 'female', 'O' => 'other'),	//表示用:患者性別
	'search_display'		=>	array('' => 'display_num', 10 => 10, 50 => 50, 100 => 100, 'all' => 'all'),	//検索結果表示件数
	'search_case_sort'		=>	array('updateTime' => 'Last Updated', 'caseID' => 'case ID'),	//ケース検索ソート
	'search_sort'			=>	array('desc' => 'desc', 'asc' => 'asc'),	//検索昇順/降順
	'search_series_sort'	=>	array('patientInfo.patientID' => 'patient ID',
									  'patientInfo.patientName' => 'patient name', 'patientInfo.age' => 'age',
									  'patientInfo.sex' => 'sex', 'seriesDate' => 'series date',
									  'modality' => 'modality', 'seriesDescription' => 'series description'),	//シリーズ検索ソート
	'hash_key'				=>	'todai_test',
	'crypt_secret_key'		=>	'todai_project',
	'upload_path'			=>	dirname(dirname(dirname(__FILE__))).'/public/uploads/',
	'label_img_save_path'	=>	dirname(dirname(__FILE__)).'/storage/labelImage/'
);