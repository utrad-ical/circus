(function($) {
	var defaults = {
		colorsPerLine: 8,
		colors: ['#000000', '#444444', '#666666', '#999999', '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff'
			, '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff'
			, '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc'
			, '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd'
			, '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0'
			, '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79'
			, '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47'
			, '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4C1130'],
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