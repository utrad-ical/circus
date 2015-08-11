@extends('common.layout')

@section('title')
	Home
@stop

@section('content')
	<p>Welcome to CIRCUS DB!</p>
	<ul class="column_menu">
		<li>
			<a href="case/search">
				<span class="jumbo_icon case_search"></span>
				<p>Case Search</p>
			</a>
			<p>Search and edit existing cases.</p>
		</li>
		<li>
			<a href="series/search">
				<span class="jumbo_icon series_search"></span>
				<p>Series Search</p>
			</a>
			<p>Search uploaded series,<br/> and define new cases.</p>
		</li>
		<li>
			<a href="series/import">
				<span class="jumbo_icon series_import"></span>
				<p>Series Import</p>
			</a>
			<p>Upload DICOM image files directly via the browser.</p>
		</li>
	</ul>
@stop
