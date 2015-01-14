/**
 * jQuery seriealizer plugin
 */

(function($) {
	function fromObject(obj) {
		this.clearForm();
		var self = this;
		$.each(obj, function(key, val) {
			var ns = '[name="' + key + '"]';
			var tmp = $(':checkbox, :radio, :text, :password, select, textarea').filter(ns);
			if (tmp.length) {
				if (tmp.is(':radio') || tmp.is(':checkbox') && !$.isArray(val)) val = [val];
				tmp.val(val);
			}
			var elem = $('#' + key);
			if (elem.is('.ui-daterange')) {
				elem.daterange('option', 'kind', val[0]);
				elem.daterange('option', 'fromDate', val[1]);
				elem.daterange('option', 'toDate', val[2]);
			}
		});
		return this;
	}

	function toObject() {
		var result = {};
		var self = this;
		$('input, textarea, select', this).filter(':not(.ui-daterange *)').each(function() {
			var e = $(this);
			var name = e.prop('name');
			if (!name.length || name in result) return;
			var v = null;
			if (e.is('textarea')) {
				v = e.val();
			} else if (e.is(':radio')) {
				v = $('input[name="' + name + '"]:checked', self).val();
			} else if (e.is(':checkbox')) {
				var tmp = $('input[name="' + name + '"]', self);
				if (tmp.length == 1) // single
					v = tmp.filter(':checked').val();
				else // multiple
					v = tmp.filter(':checked').map(function() {
						return $(this).val();
					}).get();
			} else if (e.is(':text, :password')) {
				v = e.val();
			} else if (e.is('select')) {
				if (e.prop('multiple')) {
					v = $('option:selected', e).map(function() {
						return $(this).val();
					}).get();
				} else {
					v = $('option:selected', e).val();
				}
			}
			result[name] = v;
		});
		$('.ui-daterange').each(function() {
			var e = $(this);
			var name = e.prop('id');
			result[name] = [
				e.daterange('option', 'kind'),
				e.daterange('option', 'fromDate'),
				e.daterange('option', 'toDate')
			];
		});
		return result;
	}

	function clearForm() {
		$(':checked', this).prop('checked', false);
		$(':selected', this).prop('selected', false);
		$(':text, :password, textarea', this).val('');
		return this;
	}

	$.fn.extend({
		fromObject: fromObject,
		toObject: toObject,
		clearForm: clearForm
	});
})(jQuery);