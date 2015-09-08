/* Include this JS to use the tag related features. */
/* Requires common.js color picker. */

var tag = {};
(function () {
	var projectTagList = {};

	// http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
	function lumiComp(hex) {
		var intensity = parseInt(hex, 16) / 255;
		if (intensity <= 0.03928) return intensity / 12.92;
		return Math.pow((intensity + 0.055) / 1.055, 2.4);
	}

	function textColor(color) {
		// TODO: consider using TinyColor library
		if (typeof color !== 'string') return '#000000';
		var m = /\#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/.exec(color.toLowerCase());
		if (!m || m.length < 4) return '#000000';
		var r = lumiComp(m[1]);
		var g = lumiComp(m[2]);
		var b = lumiComp(m[3]);
		var l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		return l > 0.5 ? '#000000' : '#ffffff';
	}

	function renderTag(color) {
		return this.each(function () {
			var root = $(this);
			root.addClass('tag');
			root.css('background-color', color);
			root.css('color', textColor(color));
		});
	}

	/**
	 * Registers the project tag list.
	 * @param list { projectID[string]: TagInfo[] }
	 */
	function registerProjectTags(list) {
		if (typeof list !== 'object') return;
		projectTagList = $.extend(projectTagList, list);
	}
	tag.registerProjectTags = registerProjectTags;

	/**
	 * When this module doesn't know the tag list,
	 * ask it to the server.
	 * It is recommended to register such list beforehands
	 * to reduce the number of connections.
	 * @param projectID
	 * @param callback
	 */
	function fetchProjectTags(projectID, callback) {
		api('project/' + projectID, {
			success: function(data) {
				var tmp = {};
				tmp[projectID] = data.tags || [];
				registerProjectTags(tmp);
				callback();
			}
		});
	}

	/**
	 * Opens tag selection dialog.
	 * @param projectID Target project ID.
	 * @param current string[] Currently selected tags.
	 */
	function tagSelector(projectID, current, callback) {
		if (!(projectID in projectTagList)) {
			fetchProjectTags(projectID, function() {
				tagSelector(projectID, current, callback);
			})
			return;
		}

		var projectTags = projectTagList[projectID];
		if (!$.isArray(current)) current = [];

		var dialog = $('<div>')
			.attr('title', 'Select Tags')
			.addClass('balloon');
		var list = $('<ul>').appendTo(dialog);
		projectTags.forEach(function(tag) {
			var li = $('<li>')
				.addClass('selectable')
				.appendTo(list);
			$('<span>')
				.text(tag.name)
				.tag(tag.color)
				.appendTo(li);
		});
		dialog.dialog({
			dialogClass: 'tag-selector',
			buttons: {
				Cancel: function() {
					dialog.dialog('close');
				},
				OK: function() {
					dialog.dialog('close');
					var selected = [];
					$('input:checked', list).each(function() {
						selected.push($(this).data('tag'));
					})
					callback(selected);
				}
			}
		});
	}
	tag.tagSelector = tagSelector;

	$.fn.extend({tag: renderTag});
})(tag);