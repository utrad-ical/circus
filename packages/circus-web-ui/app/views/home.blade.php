@extends('common.layout')

@section('title')
	Home
@stop

@section('content')
	<p>Welcome to CIRCUS DB!</p>
	<ul class="column_menu">
		<li>
			<a href="case/search">
				<div class="img"><span class="circus-icon circus-icon-case-search"></span></div>
				<p>Case Search</p>
			</a>
			<p>Search and edit existing cases.</p>
		</li>
		<li>
			<a href="series/search">
				<div class="img"><span class="circus-icon circus-icon-series-search"></span></div>
				<p>Series Search</p>
			</a>
			<p>Search uploaded series,<br/> and define new cases.</p>
		</li>
		<li>
			<a href="series/import">
				<div class="img"><span class="circus-icon circus-icon-series-import"></span></div>
				<p>Series Import</p>
			</a>
			<p>Upload DICOM image files directly via the browser.</p>
		</li>
	</ul>
@stop
