@if ($prj_tags && count($case_tags) > 0)
	@foreach ($prj_tags as $idx => $prj_tag)
		{{Form::checkbox('tags', $idx, (array_search($idx, $case_tags) !== false), array('id' => $tag_caseID.'_'.$idx, 'class' => 'select_tags'))}}
		<div class="tag" style="color: rgb(255, 255, 255); background-color: {{{$prj_tag['color']}}};">
			{{Form::label($tag_caseID.'_'.$idx, $prj_tag["name"])}}
		</div>
	@endforeach
@endif