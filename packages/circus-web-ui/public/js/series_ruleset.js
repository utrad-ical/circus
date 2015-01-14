/**
 * Series rulesets.
 */

if (typeof circus == 'undefined') circus = {};

circus.ruleset = (function() {

	var op = [
		{op: '=', label: 'is'},
		{op: '>', label: '>'},
		{op: '<', label: '<'},
		{op: '>=', label: '>='},
		{op: '<=', label: '<='},
		{op: '!=', label: 'is not'},
		{op: '*=', label: 'contains'},
		{op: '^=', label: 'begins with'},
		{op: '$=', label: 'ends with'}
	];
	var oph = {};
	for (var i = 0; i < op.length; i++) oph[op[i].op] = op[i];

	/**
	 * Converts the given filter node into human-readable format.
	 */
	function stringifyNode(node)
	{
		var depth = arguments[1] ? arguments[1] : 0;

		function stringifyGroupNode(node)
		{
			var result = $('<span>').addClass('group-text');
			for (var i = 0; i < node.members.length; i++)
			{
				if (i > 0)
					result.append(
						' ',
						$('<span>').addClass('group-type-text').text(node.group),
						' '
					);
				result.append(stringifyNode(node.members[i], depth + 1));
			}
			if (depth)
			{
				result.prepend($('<span class="paren">(</span>'));
				result.append($('<span class="paren">)</span>'));
			}
			return result;
		}

		function stringifyComparisonNode(node)
		{
			return $('<span>').addClass('comparison-text').append(
				$('<span>').addClass('key-text').text(node.key),
				' ',
				$('<span>').addClass('condition-text').text(oph[node.condition].label),
				' ',
				$('<span>').addClass('value-text').text(node.value)
			);
		}

		if (node.members instanceof Array)
			return stringifyGroupNode(node);
		else if (node.key !== undefined)
			return stringifyComparisonNode(node);
		else
			throw "exception";
	}

	function stringifyRule(rule)
	{
		var results = [];
		var st = parseInt(rule.start_img_num) || 0;
		var ed = parseInt(rule.end_img_num) || 0;
		if (st > 0 || ed > 0)
			results.push('Clip(' + st + ' - ' + ed + ')');
		if (typeof(rule.required_private_tags) == 'string'
			&& rule.required_private_tags.length > 0)
		{
			results.push('Require private tags(' + rule.required_private_tags + ')');
		}
		if (rule.image_delta > 0)
		{
			results.push('Direction(forward)');
		}
		if (rule.image_delta < 0)
		{
			results.push('Direction(reverse)');
		}
		if (rule.environment)
		{
			results.push('Environment(' + rule.environment + ')');
		}
		if (rule.continuous)
		{
			results.push('Continuous');
		}

		return results.join(', ');
	}

	return {
		op: op,
		stringifyNode: stringifyNode,
		stringifyRule: stringifyRule
	};
})();