/* Include this JS to use the tag related features. */
/* Requires common.js color picker. */

var tag = {};
(function () {
	var projectTagList = {};
	var pendingRequests = {};

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
		if (projectTagList[projectID] && callback) {
			setTimeout(callback(projectTagList[projectID]), 0);
			return;
		}
		if (projectID in pendingRequests) {
			// HTTP request alraedy in progress
			pendingRequests[projectID].push(callback);
			return;
		}
		pendingRequests[projectID] = [callback];
		api('project/' + projectID, {
			success: function (data) {
				var tmp = {};
				tmp[projectID] = data.tags || [];
				registerProjectTags(tmp);
				pendingRequests[projectID].forEach(function(callback) {
					typeof callback === 'function' && callback(projectTagList[projectID]);
				});
				delete pendingRequests[projectID];
			}
		});
	}
	tag.fetchProjectTags = fetchProjectTags;

	function randomID() {
		return '_' + (((1 + Math.random()) * 0x1000000) | 0).toString(16);
	}

	function popup(element, target, callback) {
		element.on('click', function (event) {
			event.stopPropagation();
		});
		element.position({my: 'top', at: 'bottom', of: target});
		element.appendTo('body').show();
		var handler = function () {
			$(document).off('click.popup');
			typeof callback === 'function' && callback();
			element.remove();
		}
		$(document).on('click.popup', handler);
	}

	/**
	 * Opens tag selection dialog.
	 * @param projectID Target project ID.
	 * @param current string[] Currently selected tags.
	 */
	function tagSelector(projectID, target, current, callback) {
		fetchProjectTags(projectID, function (projectTags) {
			if (!$.isArray(current)) current = [];
			var dialog = $('<div>')
				.attr('title', 'Select Tags')
				.addClass('popup tag-selector');
			var list = $('<ul>').appendTo(dialog);
			projectTags.forEach(function (tag) {
				var li = $('<li>')
					.addClass('selectable')
					.appendTo(list);
				var id = randomID();
				$('<input type="checkbox">')
					.attr('id', id)
					.data('tag', tag.name)
					.prop('checked', current.indexOf(tag.name) >= 0)
					.appendTo(li);
				$('<label>')
					.attr('for', id)
					.text(tag.name)
					.tag(tag.color)
					.appendTo(li);
			});
			popup(dialog, target, function () {
				var selected = [];
				$('input:checked', list).each(function () {
					selected.push($(this).data('tag'));
				});
				typeof callback === 'function' && callback(selected);
			});
		});
	}
	tag.tagSelector = tagSelector;

	function tagList(tags, projectID) {
		return this.each(function () {
			var el = $(this);
			tags.forEach(function (tag) {
				var color = '#888888';
				projectTagList[projectID].some(function(t) {
					if (t.name === tag) {
						color = t.color;
						return true;
					}
				});
				$('<span>').text(tag).tag(color).appendTo(el);
			});
		});
	}

	function tagListEditor(tags, projectID, caseID) {
		return this.each(function () {
			var current = tags;
			var container = $(this);
			var list = $('<span>').appendTo(container);
			fetchProjectTags(projectID, function(tagList) {
				list.tagList(tags, projectID);
				var button = $('<button>')
					.addClass('tag_edit_button')
					.append($('<span class="ui-icon ui-icon-pencil">'))
					.on('click', function (event) {
						event.stopPropagation();
						tagSelector(projectID, button, current, function (newTags) {
							if (current.join('|') === newTags.join('|')) return;
							current = newTags;
							api('save_tags', {
								data: {
									caseID: caseID,
									tags: newTags
								}
							}).then(function() {
								list.empty().tagList(newTags, projectID);
							});
						});
					});
				container.append(button);
			});
		});
	}

	$.fn.extend({
		tag: renderTag,
		tagList: tagList,
		tagListEditor: tagListEditor
	});
})(tag);