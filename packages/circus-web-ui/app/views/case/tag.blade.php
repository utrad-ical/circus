@if ($prj_tags)
	@foreach ($prj_tags as $idx => $prj_tag)
		{{Form::checkbox('tags', $idx, ($case_tags && array_search($idx, $case_tags) !== false), array('id' => $tag_caseID.'_'.$idx, 'class' => 'select_tags'))}}
		<script>renderTag("{{$prj_tag['name']}}", "{{$prj_tag['color']}}", "{{{$tag_caseID.'_'.$idx}}}");</script>
	@endforeach
@endif