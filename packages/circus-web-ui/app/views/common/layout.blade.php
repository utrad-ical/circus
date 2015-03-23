<!DOCTYPE HTML>
<html>
<head>
	<meta charset="utf-8">
	<title>
		@yield('title')
	</title>
	{{HTML::style('css/common.css')}}
	{{HTML::style('css/layout.css')}}
	{{HTML::style('css/color.css')}}
	@yield('page_css')
	{{HTML::script('js/jquery-1.11.1.min.js')}}
	{{HTML::script('js/common.js')}}
	@yield('page_js')
</head>
@if (Auth::check())
<?php
	$user_pref = Auth::user()->preferences;
	$class_theme = $user_pref['theme'];
?>
	<body class="{{$class_theme}}">
@else
	<body class="mode_white">
@endif
	<div id="wrapper">
		<div id="header">
			<div class="header_logo">
				<a href="{{asset('home')}}">
					<img src="{{asset('img/common/header_logo.png')}}" width="192" height="40" alt="CIRCUS">
				</a>
			</div>
			{{Form::open(['url' => $_SERVER['REQUEST_URI'], 'method' => 'POST'])}}
				<ul id="btn_area">
					<li class="color_btn color_btn_white">
						<label>
							{{Form::radio('color_mode', '0', isset($class_theme) && ($class_theme == 'mode_white') ? true : false, array('class' => 'color_select', 'id' => 'color_mode_white'))}}
						</label>
					</li>
					<li class="color_btn color_btn_black">
						<label>
							{{Form::radio('color_mode', '1', isset($class_theme) && ($class_theme == 'mode_black') ? true : false, array('class' => 'color_select', 'id' => 'color_mode_black'))}}
						</label>
					</li>
					@if (Auth::check())
						<li class="btn_settings">
							<div id="settings_wrap">
								<p id="setting_switch">settings</p>
								<div id="settings_main_wrap">
									<ul id="settings_list">
										<li>{{HTML::link(asset('home'), 'Home')}}</li>
										<li>{{HTML::link(asset('logout'), 'Logout')}}</li>
										<li>{{HTML::link(asset('preference'), 'Preferences')}}</li>
									</ul>
								</div>
							</div>
						</li>
						<li id="user_info_area">
							<span class="font_red">
								{{Auth::user()->description}}
							</span>
						</li>
					@endif
				</ul>
			{{Form::close()}}
			<div class="clear">&nbsp;</div>
		</div>
		<div class="page_contents_outer">
			<div class="page_contents_inner">
				<div class="page_unique" @yield('page_id')>
					<h1 class="page_ttl">
					@yield('page_title')
					</h1>
					@yield('content')
				</div>
			</div>
			@if (Auth::check())
				@include('common.navi')
			@endif
			<div class="clear">&nbsp;</div>
		</div>
		<div id="footer">
		</div>
	</div>
	</body>
</html>