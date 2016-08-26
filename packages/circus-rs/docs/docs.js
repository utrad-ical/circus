$('article table').addClass('table table-hover');

$('.toc').each(function() {
	var toc = $(this).addClass('list-group');
	toc.find('>li').addClass('list-group-item');
});

$('div.live-demo').each(function() {
	var panel = $(this);
	panel.addClass('panel panel-primary');
	var panelBody = $('<div class="panel-body">').appendTo(panel);
	var pre = panel.find('pre').appendTo(panelBody);
	var result = panel.find('.result').appendTo(panelBody);
	if (panel.prop('title')) {
		$('<div class="panel-heading">').text(panel.prop('title')).prependTo(panel);
	}
	var button = $('<button class="btn btn-primary">').text('Run').appendTo(panel.find('.panel-body'));
	button.on('click', function(event) {
		var js = pre.text();
		eval(js);
	});
});
