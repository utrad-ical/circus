/* Include this JS to use the tag related features. */
/* Requires common.js color picker. */

var tag;
(function () {
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

	$.fn.extend({tag: renderTag});
})(tag);


