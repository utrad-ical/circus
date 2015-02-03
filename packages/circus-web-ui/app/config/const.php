<?php
//共通の定数定義はこのファイル内で行う
return array(
	'page_display'			=>	50,	//デフォルトの検索結果1ページ表示件数
	'patient_sex'			=>	array('M' => 'male', 'F' => 'female', 'O' => 'other'),	//表示用:患者性別
	'search_display'		=>	array('' => 'display_num', 10 => 10, 50 => 50, 100 => 100, 'all' => 'all'),	//検索結果表示件数
	'search_case_sort'		=>	array('' => 'Sort Order', 'updateTime' => 'Last Update', 'caseID' => 'ID'),	//検索結果ソート順(ケース)
	'week_day'				=>	array('日', '月', '火', '水', '木', '金', '土'),	//曜日(日本語表記)
	'search_series_sort'	=>	array('' => 'Sort Order', 'updateTime' => 'Last Update', 'seriesUID' => 'ID'),	//検索結果ソート順(シリーズ)
	'hash_key'				=>	'todai_test',
	'search_revision_sort'	=>	array('' => 'Sort Order', 'revision.date' => 'Edit Time', 'revisionNo' => 'revisionNo'),	//検索結果ソート順(ケース)
	'crypt_secret_key'		=>	'todai_project',
	'upload_path'			=>	dirname(dirname(dirname(__FILE__))).'/public/uploads/',
	'label_img_save_path'	=>	dirname(dirname(__FILE__)).'/storage/labelImage/'
);