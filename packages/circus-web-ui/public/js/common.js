$(function () {

	/* Temporarily changes the color theme */
	$('#color_switch').click(function() {
		var body = $('body');
		if (body.hasClass('mode_black')) {
			body.removeClass('mode_black').addClass('mode_white');
		} else {
			body.removeClass('mode_white').addClass('mode_black');
		}
	});

	/* Construct jQuery UI widgets */

	// datepicker
	if ($('.datepicker').length > 0) {
		$('.datepicker').datepicker({
			dateFormat: "yy/mm/dd"
		});
	}

	// UI multiple select
	if ($('.multi_select').length > 0) {
		if (typeof multi_selected_item !== undefined) {
			$('.multi_select').find('option').each(function () {
				if ($.inArray($(this).val(), multi_selected_item) !== -1) {
					$(this).attr('selected', 'selected');
				}
			});
		}

		$('.multi_select').not('.active').multiselect({
			header: false,
			noneSelectedText: '(all)',
			selectedList: 10
		}).addClass('active');
	}

	// UI sortable
	if ($('.ui-sortable').length > 0) {
		$('.ui-sortable').sortable({
			axis: "y"
		});
	}

});

// Pads '0' at the left of the given string
var zeroFormat = function (input, width) {
	var n = String(input).length;
	if (width > n) {
		return (new Array(width - n + 1)).join(0) + input;
	} else {
		return input;
	}
};


var setHiddenParams = function (parent_id, elm_name, val) {
	var elm = $('#'+parent_id).find("input[name='"+elm_name+"']");

	if (!elm[0]) {
		elm = $("<input>", {type:"hidden", name:elm_name, value:val});
		$('#'+parent_id).append(elm);
	} else {
		$('#'+parent_id).find("input[name='"+elm_name+"']").val(val);
	}
};


/* Task Watcher */
$.fn.extend({
	taskWatcher: function (taskID) {
		return this.each(function () {
			var root = $(this).empty().addClass('task-watcher').show();
			var title = $('<div>').addClass('task-watcher-title').text('Progress');
			var progress = $('<div>').progressbar().appendTo(root);
			var indicator = $('<div>').addClass('task-watcher-indicator').appendTo(root);

			var inquiry = function () {
				$.ajax({
					url: '/task/' + taskID,
					method: 'get',
					cache: false,
					dataType: 'json'
				}).then(function (data) {
					if (data.max > 0) {
						progress
							.progressbar('option', 'max', data.max)
							.progressbar('option', 'value', data.value);
					} else {
						progress.progressbar('option', 'value', false); // indeterminate
					}
					indicator.text(data.textStatus);
					if (data.status == 'finished') {
						progress.progressbar('option', 'max', 100).progressbar('option', 'value', 100);
						root.addClass('task-watcher-finished');
						$('<button>')
							.addClass('common_btn')
							.text('OK')
							.appendTo(root)
							.on('click', function() {
								root.empty().hide();
								root.trigger('finish');
							});
					} else {
						setTimeout(inquiry, 1000);
					}
				});
			};

			inquiry();
		});
	}
});

function dicomImageServerUrl() {
	var port = 3000;
	return location.protocol + '//' + location.hostname + ':' + port + '/';
}

/* Tags */

$.fn.extend({
	tag: function (color) {
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

		return this.each(function () {
			var root = $(this);
			root.addClass('tag');
			root.css('background-color', color);
			root.css('color', textColor(color));
		});
	}
});

/*
 * Simple Color Picker
 * Based on simple-color-picker released under the MIT License
 * Copyright (c) 2010 Rachel Carvalho <rachel.carvalho@gmail.com>
 */

(function($) {
	var defaults = {
		colorsPerLine: 8,
		colors: ['#000000', '#444444', '#666666', '#999999', '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff',
			'#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
			'#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
			'#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
			'#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0',
			'#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79',
			'#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47',
			'#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4C1130'],
		onChangeColor: null
	};

	var closeHandlerRegistered = false;

	function closeAllPickers() {
		$('.color-picker').remove();
	}

	$.fn.simpleColorPicker = function (options) {
		var opts = $.extend(defaults, options);

		if (!closeHandlerRegistered) {
			$('body').on('click', closeAllPickers);
			closeHandlerRegistered = true;
		}

		return this.each(function () {
			var element = $(this);
			var popup;
			element.on('focus click', function (event) {
				event.stopPropagation();
				if (popup && popup.is(':visible')) return;
				closeAllPickers();

				popup = $('<div>').addClass('color-picker');
				var ul = $('<ul>');
				opts.colors.forEach(function (color, i) {
					var li = $('<li>').css('background-color', color).data('color', color)
						.addClass('color-box').prop('title', color).appendTo(ul);
					if (i % opts.colorsPerLine === 0) li.css('clear', 'both');
				});
				popup.append(ul, '<div style="clear: both;">').appendTo('body');

				popup.on('click', 'li.color-box', function (event) {
					if (!popup.is(':visible')) return;
					event.stopPropagation();
					selected = $(event.target).data('color');
					if (element.is('input')) {
						element.val(selected);
						element.blur();
					}
					element.data('color', selected);
					if ($.isFunction(opts.onChangeColor)) {
						opts.onChangeColor.call(element, selected);
					}
					element.trigger('change');
					closeAllPickers();
				});

				var pos = element.offset();
				var left = pos.left + element.outerWidth() - popup.outerWidth();
				if (left < pos.left) left = pos.left;
				popup.css({left: left, top: (pos.top + element.outerHeight())}).show();
			});
		});
	};
})(jQuery);