/**
 * circus-common.js - contains codes widely used throughout the CIRCUS system.
 *
 * Currently this file contains scripts for dynamic layout elements.
 */

var circus = circus || {};

//Initialize
$(function(){
	// Process elements with 'form-btn' and 'radio-to-button' classes
	$('body').autoStylize();
	// Adjust container height
	var resized = function() {
		$('#container').height($(document).height() - 10);
	};
	$(window).bind('resize', resized);
	resized();

	// If CSS3 background-size is supported, use higher resolution background
	if (document.createElement("div").style.backgroundSize === '')
	{
		$('.topmenu, #stats_menu').addClass('hi');
	}

	// Calendar in the menu
	var month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',	'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
	$('#menu .month').text(month[(new Date()).getMonth()]);
	$('#menu .day').text((new Date()).getDate());
});

$.fn.autoStylize = function() {
	return this.each(function() {
		var _this = $(this);
		_this.find('.radio-to-button').addBack().filter('.radio-to-button').radioToButton({
			normal: 'radio-to-button-normal',
			hover: 'radio-to-button-hover',
			checked: 'radio-to-button-checked',
			disabled: 'radio-to-button-disabled'
		});
	});
};

// 'enable' method enables given input element by removing 'disabled' attribute.
// It additionally triggers 'flush' event for custom UI buttons.
// If boolean value is passed as the first argument, it can disable/enable
// elements according to that value.
$.fn.enable = function() {
	var flag = true;
	if (arguments.length >= 1)
		flag = arguments[0];
	if (flag)
		return $(this).filter(':disabled')
			.removeAttr('disabled').trigger('flush').end();
	else
		return $(this).disable();
};

// 'disable' method disables given input elements by adding 'disabled' attribute.
// It also triggers 'flush' event.
$.fn.disable = function() {
	return $(this).filter(':not(:disabled)')
		.attr('disabled', 'disabled').trigger('flush').end();
};

// 'radioToButton' can make radio buttons have appearance of normal buttons.
$.fn.radioToButton = function(styles) {
	return this.each(function() {
		var _radio = $(this);
		if (!_radio.is('input[type=radio]')) return;
		if (_radio.data('radioToButtonInit')) return;
		if (_radio.attr('label').length == 0) return;
		var setStyle = function(hover)
		{
			$.each(styles, function(k, v) { btn.removeClass(v); });
			if (_radio.is(':checked'))
			{
				btn.addClass(styles['checked']);
			} else if (_radio.is(':disabled')) {
				btn.addClass(styles['disabled']);
			} else if (hover) {
				btn.addClass(styles['hover']);
			} else {
				btn.addClass(styles['normal']);
			}
		};
		var flush = function() { setStyle(false); };
		var btn = $('<a>')
			.addClass(_radio.attr('class'))
			.text(_radio.attr('label'))
			.attr('title', _radio.attr('title') ? _radio.attr('title') : '')
			.hover(
				function() { setStyle(true); },
				function() { setStyle(false); }
			)
			.click(function(){
				if (_radio.is(':disabled')) return;
				_radio.click();
				var container = $(_radio).closest('form');
				if (container.length == 0) container = $('body');
				$(':radio[name='+_radio.attr('name')+']', container).trigger('flush');
				return false;
			})
			.mousedown(function() { return false; })
			.insertAfter(_radio);
		_radio
			.bind('flush', function() { flush(); })
			.hide(0)
			.data('radioToButtonInit', true);
		flush();
	});
};

// Shows simple toolhint. requires jQuery UI.
$.fn.toolhint = function(option) {
	var params = option;
	if (typeof params == 'string') params = { content: params };
	if (typeof params.content == 'string') params.content = $('<span>').text(params.content);
	var defaults = {
		my: 'center top',
		at: 'center bottom',
		offset: '0 3'
	};
	params = $.extend(defaults, params);

	return this.each(function() {
		var elem = $(this);
		elem.hover(
			function() {
				var content = params.content.clone().show();
				var tip = $('<div>')
					.addClass('toolhint')
					.append(content)
					.appendTo($('body'));
				if ('width' in params) tip.css('width', params.width);
				if ('tipClass' in params) tip.addClass(params.tipClass);
				var tmp = { my: params.my, at: params.at, offset: params.offset };
				tmp.of = params.of ? params.of : elem;
				tip.position(tmp);
			},
			function() {
				$('div.toolhint').remove();
			}
		);
	});
};

// webapi method calls CIRCUS CS Web API.
$.extend({
	'webapi': function(options) {
		function defaultFailedHandler(errorMessage, data)
		{
			// console && console.log(errorMessage, data);
			alert("API Error:\n" + errorMessage)
		}

		var defaults = {
			api: circus.totop + 'api/api.php',
			action: null,
			params: {},
			onSuccess: $.noop,
			onFail: defaultFailedHandler
		};
		var settings = $.extend({}, defaults, options);
		var request = { action: settings.action, auth: { type: 'session' }};
		request.params = settings.params;

		$.post(
			settings.api,
			{ request: JSON.stringify(request) },
			function (data) {
				try {
					var obj = JSON.parse(data);
				} catch (e) {
					settings.onFail(data, data);
					return;
				}
				if (obj.status == 'OK')
				{
					if (settings.onSuccess instanceof Function)
						settings.onSuccess(obj.result);
				}
				else
				{
					settings.onFail(obj.error.message, JSON.parse(data));
				}
			},
			'text'
		);
	},
	'loadUI': function(callback) {
		if (typeof callback != 'function') callback = $.noop;
		if (typeof jQuery.ui == 'undefined')
		{
			var css = circus.totop + 'jq/ui/theme/jquery-ui.custom.css';
			if (document.createStylesheet) { // for IE
				document.createStyleSheet(css);
			}
			else
			{
				$('<style>').attr('type', 'text/css')
				.html('@import url("' + css + '")')
				.appendTo("head");
			}
			$.getScript(circus.totop + 'jq/ui/jquery-ui.min.js', callback);
		}
		else
		{
			callback();
		}
	},
	'alert': function() {
		var a = $.merge([], arguments);
		a.push(['OK']);
		$.choice.apply(this, a);
	},
	'confirm': function() {
		var a = $.merge([], arguments);
		a.push(['Cancel', 'OK']);
		$.choice.apply(this, a);
	},
	'choice': function() {
		var prompt = '';
		var callback = $.noop;
		var options = {};
		var choices = ['Close'];
		var result = false;
		for (var i = 0; i < arguments.length; i++)
		{
			var arg = arguments[i];
			if (typeof arg == 'string') prompt = arg;
			if (typeof arg == 'object') options = arg;
			if (typeof arg == 'function') callback = arg;
			if (arg instanceof Array) choices = arg;
		}
		var buttons = [];
		for (var i = 0; i < choices.length; i++)
		{
			(function(ii) {
				buttons.push({
					text: choices[i],
					click: function() {
						result = ii;
						$(this).dialog('close');
					}
				})

			})(i); // closure
		}
		var params = $.extend({
			buttons: buttons,
			modal: true,
			draggable: false,
			resizable: false,
			title: 'CIRCUS CS',
			close: function() { callback(result); }
		}, options);
		$.loadUI(function() {
			$('<div>').html(prompt).attr('title', params.title).dialog(params);
		})
	}
});