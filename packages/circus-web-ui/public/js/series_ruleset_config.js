$(function() {

	var targetPlugin = null;
	var targetPluginName = null;

	var pluginRuleSetsData = null;
	var labels = null;
	var currentRuleSet = null;

	var modified = false;

	function exitEdit()
	{
		$('#selector-pane, #editor-pane').hide();
		$('#plugin-selector-pane').show();
		targetPlugin = null;
		modified = false;
	}

	function enterEdit()
	{
		$('#selector-pane, #editor-pane').show();
		$('#selected-plugin-name').text(targetPluginName);
		$('#plugin-selector-pane').hide();
		$('#plugin-select').val(['']);
		modified = false;
		$('#save-button').disable();
	}

	function createRuleFromElement()
	{
		var rule = {};
		rule.start_img_num = Math.max(parseInt($('#start-img-num').val()) || 0, 0);
		rule.end_img_num = Math.max(parseInt($('#end-img-num').val()) || 0, 0);
		rule.required_private_tags = $('#required-private-tags').val();
		rule.image_delta = parseInt($('#image-delta').val()) || 0;
		rule.environment = $('#environment').val();
		rule.continuous = $('#continuous').prop('checked');
		return rule;
	}

	function newRuleSetListContent(item)
	{
		var div = $('<div>').addClass('content');
		$('<div>').addClass('rule-filter')
			.append(circus.ruleset.stringifyNode(item.filter)).appendTo(div);
		var rule = circus.ruleset.stringifyRule(item.rule);
		if (rule)
		{
			var icon = $('<div class="rule-rule ui-icon ui-icon-circle-arrow-e">');
			$('<div>').text(rule).prepend(icon).appendTo(div);
		}
		return div;
	}

	function modify()
	{
		modified = true;
		$('#save-button').enable();
	}

	function ruleSetChanged(event) {
		if (!currentRuleSet)
			return;
		modify();
		currentRuleSet.filter = $('#search_condition').filtereditor('option', 'filter');
		currentRuleSet.rule = createRuleFromElement();
		$('#rulesets-list li.active .content').replaceWith(
			newRuleSetListContent(currentRuleSet)
		);
	}

	function ruleSetListChanged() {
		var stage = $('#rulesets-list');
		var result = [];
		$('#rulesets-list div.volume-group').each(function() {
			var grp = $(this);
			var rulesets = [];
			$('ul.rulesets li', grp).each(function() {
				rulesets.push($(this).data('item'));
			});
			result.push(rulesets);
		});
		pluginRuleSetsData = result;
		modify();
	}

	function refreshRuleSet()
	{
		if (currentRuleSet)
		{
			$('#search_condition').filtereditor('option', 'filter', currentRuleSet.filter);

			$('#start-img-num').val(currentRuleSet.rule.start_img_num);
			$('#end-img-num').val(currentRuleSet.rule.end_img_num);
			$('#required-private-tags').val(currentRuleSet.rule.required_private_tags);
			$('#image-delta').val(currentRuleSet.rule.image_delta);
			$('#environment').val(currentRuleSet.rule.environment);
			$('#continuous').prop('checked', !!currentRuleSet.rule.continuous);

			$('#select-help').hide();
			$('#editor-contents').show();
			$('#editor-pane').addClass('active');
		}
		else
		{
			$('#select-help').show();
			$('#editor-contents').hide();
			$('#editor-pane').removeClass('active');
			hoveringElement = null;
		}
	}

	function addRuleSetClicked(event)
	{
		var grp = $(event.target).closest('.volume-group');
		if (grp.length == 0)
			return;
		var dum = {
			filter: { group: 'and', members: [{ key: 'modality', condition: '=', value: 'CT'}] },
			rule: {}
		};
		var volume_id = grp.data('volume-id');
		pluginRuleSetsData[grp.data('volume-id')].push(dum);
		refreshRuleSets();
	}

	function removeRuleSetClicked(event)
	{
		var grp = $(event.target).closest('.volume-group');
		var removed = false;
		$('#rulesets-list ul.rulesets li').each(function() {
			var item = $(this).data('item');
			if (item != null && item == currentRuleSet)
			{
				$(this).remove();
				removed = true;
			}
		})
		if (removed)
		{
			ruleSetListChanged();
			refreshRuleSets();
		}
	}

	function refreshRuleSets()
	{
		var stage = $('#rulesets-list').empty();
		$.each(pluginRuleSetsData, function(volume_id, rulesets) {
			var label = labels[volume_id];
			var grp = $('<div class="volume-group">')
				.data('volume-id', volume_id)
				.appendTo(stage);
			var t = 'Volume ID: ' + volume_id;
			var h = $('<div class="vol-id">').text(t).appendTo(grp);
			if (typeof(label) == 'string')
				h.append($('<span class="volume-label">').text(' (' + label + ')'));

			if (rulesets.length > 0)
			{
				var ul = $('<ul class="rulesets">').appendTo(grp);
				$.each(rulesets, function(index, item) {
					var li = $('<li>').appendTo(ul).data('item', item);
					$('<div>').addClass('rule-no').text('Rule Set: #' + (index + 1)).appendTo(li);
					newRuleSetListContent(item).appendTo(li);
				});
				ul.sortable({
					axis: 'y',
					containment: 'parent',
					update: function() { ruleSetListChanged(); refreshRuleSets(); }
				});
			}
			else
			{
				$('<p>').text('No rule set (any series will match)').appendTo(grp);
			}
			var tools = $('<div class="ruleset-tools">').appendTo(grp);
			$('<button class="ruleset-toolbutton">')
			.button({icons: { primary: 'ui-icon-minusthick' }})
			.click(removeRuleSetClicked).appendTo(tools);
			$('<button class="ruleset-toolbutton">')
				.button({icons: { primary: 'ui-icon-plusthick' }})
				.click(addRuleSetClicked).appendTo(tools);

		});
		currentRuleSet = null;
		refreshRuleSet();
	}

	$('#search_condition').filtereditor({keys: keys});

	// Change active ruleset
	$('#rulesets-list').click(function(event) {
		var li = $(event.target).closest('li');
		$('#rulesets-list li').removeClass('active');
		li.addClass('active');
		currentRuleSet = li.data('item');
		refreshRuleSet();
	});

	$('#plugin-select').change(function() {
		targetPlugin = $('#plugin-select').val();
		targetPluginName = $('#plugin-select option:selected').text();
		pluginRuleSetsData = [];
		labels = [];
		if (targetPlugin)
		{
				$.webapi({
				action: 'seriesRuleset',
				params: {
					plugin_id: targetPlugin,
					mode: 'get'
				},
				onSuccess: function(result) {
					for (var volume_id in result)
					{
						pluginRuleSetsData[volume_id] = result[volume_id].ruleset;
						labels[volume_id] = result[volume_id].label;
					}
					enterEdit();
					refreshRuleSets();
				}
			});/**/
		}
		else
			exitEdit();
	});

	$('#close-button').click(function() {
		if (modified)
		{
			$.confirm(
				'Exit without saving?',
				function(choice) { if (choice == 1) exitEdit(); }
			);
		}
		else
		{
			exitEdit();
		}
	});

	$('#save-button').click(function() {
		$('#save-button').disable();
		if (targetPlugin)
		{
			$.webapi({
				action: 'seriesRuleset',
				params: {
					plugin_id: targetPlugin,
					mode: 'set',
					pluginRuleSetsData: JSON.stringify(pluginRuleSetsData)
				},
				onSuccess: function(data) {
					alert('Saved');
					exitEdit();
				}
			});
		}
	});

	$('.rule-box').on('change input keyup paste', ruleSetChanged);
	$('#search_condition').on('filterchange', ruleSetChanged);
	$('#plugin-select').change();

});
