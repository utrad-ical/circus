@section('header')
<!DOCTYPE HTML>
<html>
<head>
	<meta charset="utf-8">
	<title>{{{isset($title) ? $title : 'Hello'}}}</title>
	<link rel="stylesheet" type="text/css" href="{{asset('../bootstrap/css/common.css')}}">
	<link rel="stylesheet" type="text/css" href="{{asset('../bootstrap/css/layout.css')}}">
	<link rel="stylesheet" type="text/css" href="{{asset('../bootstrap/css/color.css')}}">
	@if (isset($css))
		@foreach ($css as $cssrec)
			<link rel="stylesheet" type="text/css" href="{{asset('../bootstrap/'.$cssrec)}}">
		@endforeach
	@endif
	<script type="text/javascript" src="{{asset('../bootstrap/js/jquery-1.11.1.min.js')}}"></script>
	<script type="text/javascript" src="{{asset('../bootstrap/js/common.js')}}"></script>
	@if (isset($js))
		@foreach ($js as $jsrec)
			<script type="text/javascript" src="{{asset('../bootstrap/'.$jsrec)}}"></script>
		@endforeach
	@endif
</head>
<body class="mode_white">
	<div id="wrapper">
		<div id="header">
			<div class="header_logo">
				<a href="{{asset('/home')}}">
					<img src="{{asset('../bootstrap/img/common/header_logo.png')}}" width="192" height="40" alt="CIRCUS">
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
					@if (Auth::check())
						<li class="btn_settings">
							<div id="settings_wrap">
								<p id="setting_switch">settings</p>
								<div id="settings_main_wrap">
									<ul id="settings_list">
										<li>{{HTML::link(asset('/home'), 'Home')}}</li>
										<li>{{HTML::link(asset('/logout'), 'Logout')}}</li>
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