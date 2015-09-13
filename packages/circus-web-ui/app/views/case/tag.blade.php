<span id="{{{$case->caseID}}}_tags"/>
<script>
	(function() {
		var tags = {{json_encode($case->tags)}};
		var caseID = "{{$case->caseID}}";
		var projectID = "{{$case->projectID}}";
		$('#{{{$case->caseID}}}_tags').tagListEditor(tags, projectID, caseID);
	})();
</script>