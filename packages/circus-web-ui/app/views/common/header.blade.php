@section('header')
<!DOCTYPE HTML>
<html>
<head>
	<meta charset="utf-8">
	<title>{{$title}}</title>
	{{HTML::style('css/common.css')}}
	{{HTML::style('css/layout.css')}}
	{{HTML::style('css/color.css')}}
	@if (isset($css))
		@foreach ($css as $cssrec)
			{{HTML::style($cssrec)}}
		@endforeach
	@endif
	{{HTML::script('/js/jquery-1.11.1.min.js')}}
	{{HTML::script('/js/common.js')}}
	@if (isset($js))
		@foreach ($js as $jsrec)
			{{HTML::script($jsrec)}}
		@endforeach
	@endif
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
				<a href="{{asset('/home')}}">
					<img src="{{asset('/img/common/header_logo.png')}}" width="192" height="40" alt="CIRCUS">
				</a>
			</div>
			{{Form::open(['url' => $url, 'method' => 'POST'])}}
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
										<li>{{HTML::link(asset('/home'), 'Home')}}</li>
										<li>{{HTML::link(asset('/logout'), 'Logout')}}</li>
										<li>{{HTML::link(asset('/preference'), 'Preferences')}}</li>
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
@stop