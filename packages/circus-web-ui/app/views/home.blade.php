@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">ホーム</h1>
			<p><span class="font_red">2</span>件の新着情報があります</p>
			<ul>
				<li>2014/07/12 18:03 Revision 3124 が編集されました。</li>
				<li>2014/07/12 17:21 Revision 3123 が編集されました。</li>
			</ul>
		</div>
	</div>

	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')
