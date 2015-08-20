//Tags
var getSelectedTags = function(parent_obj) {
	var tags = new Array();
	parent_obj.find('.select_tags:checked').each(function(){
		tags.push($(this).val());
	});
	return tags;
}
var renderTag = function(tag_name, tag_color, tag_key) {
	var tag_label = $("<label for='"+tag_key+"'>"+tag_name+"</label>");
	var tag_div = $('<div>').tag(tag_color);

	tag_div.append(tag_label);
	$('#'+tag_key).after(tag_div);
}

$(function() {
	$('.select_tags').change(function() {
		var tag_parent = $(this).closest('.revision_tag_wrap');
		var case_tags = getSelectedTags(tag_parent);
	  	save_tags = JSON.stringify(case_tags);

	  	var tag_obj = $(this).attr('id').split('_');

	  	var tag_data = {caseID: tag_obj[0], tags:save_tags};
		$.ajax({
			url: "save_tags",
			type: 'post',
			data: tag_data,//送信データ
			dataType: 'json',
			error: function () {
			   alert('I failed to communicate.');
			},
			success: function (response) {
			}
		});
	});
});