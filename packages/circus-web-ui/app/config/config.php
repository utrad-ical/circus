<?php
//ユーザが設定可能なConfig
return array(
	'page_display'			=>	50,	//デフォルトの検索結果1ページ表示件数
	'upload_path'			=>	dirname(__FILE__).'/../uploads/',
	'group_authority'		=>	array('createProject' => 'Create Project', 'deleteProject' => 'Delete Project', 'createCase' => 'Create Case', 'restartServer' => 'Restart Server') //グループ権限
);