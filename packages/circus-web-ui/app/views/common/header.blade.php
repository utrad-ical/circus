@section('header')
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <title>{{{isset($title) ? $title : 'Hello'}}}</title>
	<link rel="stylesheet" type="text/css" href="{{{asset('../bootstrap/css/common.css')}}}">
	<link rel="stylesheet" type="text/css" href="{{{asset('../bootstrap/css/layout.css')}}}">
	<link rel="stylesheet" type="text/css" href="{{{asset('../bootstrap/css/color.css')}}}">
	<!-- ここにページ固有CSS。SNSHSmarty参照 -->
	<script type="text/javascript" src="{{{asset('../bootstrap/js/jquery-1.11.1.min.js')}}}"></script>
	<script type="text/javascript" src="{{{asset('../bootstrap/js/common.js')}}}"></script>
	<!-- ここにページ固有JS。SNSHSmarty参照 -->
</head>
<body class="mode_white">
	<div id="wrapper">
		<div id="header">
			<div class="header_logo">
				<a href="{{{asset('/home')}}}">
					<img src="{{{asset('../bootstrap/img/common/header_logo.png')}}}" width="192" height="40" alt="CIRCUS">
				</a>
			</div>
			{{Form::open(['url' => $url, 'method' => 'POST'])}}
				<ul id="btn_area">
					<li class="color_btn color_btn_white">
						<label>
							{{Form::radio('color_mode', '0', true, array('class' => 'color_select', 'id' => 'color_mode_white'))}}
						</label>
					</li>
					<li class="color_btn color_btn_black">
						<label>
							{{Form::radio('color_mode', '1', false, array('class' => 'color_select', 'id' => 'color_mode_black'))}}
						</label>
					</li>
					@if (isset($user_name))
						<li class="btn_settings">
							<div id="settings_wrap">
								<p id="setting_switch">settings</p>
								<div id="settings_main_wrap">
									<ul id="settings_list">
										<li><a href="{{{asset('/home')}}}">Home</a></li>
										<li><a href="{{{asset('/logout')}}}">Logout</a></li>
									</ul>
								</div>
							</div>
						</li>
						<li id="user_info_area">
							<span class="font_red">
								<?php echo $user_name; ?>
							</span>
						</li>
					@endif
				</ul>
			{{Form::close()}}
			<div class="clear">&nbsp;</div>
		</div>
@stop