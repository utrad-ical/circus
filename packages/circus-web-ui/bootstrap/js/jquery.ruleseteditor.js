/**
 * CIRCUS filter editor
 * @author Soichiro Miki
 */

$.widget('ui.filtereditor', {
	options: {
		keys: [ { value: 'name' }, { value: 'date' } ]
	},

	_op: [
		{op: '=', label: 'is'},
		{op: '>', label: '>'},
		{op: '<', label: '<'},
		{op: '>=', label: '>='},
		{op: '<=', label: '<='},
		{op: '!=', label: 'is not'},
		{op: '*=', label: 'contains'},
		{op: '^=', label: 'begins with'},
		{op: '$=', label: 'ends with'}
	],

	_create: function() {
		var self = this;

		var keySelect = $('<select>').addClass('ui-filtereditor-key-select');
		var keys = this.options.keys;
		for (var i = 0; i < keys.length; i++)
		{
			var label = keys[i].value.replace('_', ' ');
			if ('label' in keys[i]) label = keys[i].label;
			$('<option>').attr('value', keys[i].value)
				.text(label).appendTo(keySelect);
		};
		this.keySelect = keySelect;

		var opSelect = $('<select>').addClass('ui-filtereditor-operation-select');
		for (i = 0; i < this._op.length; i++)
		{
			$('<option>').attr('value', this._op[i].op)
				.text(this._op[i].label).appendTo(opSelect);
		}
		this.opSelect = opSelect;

		this.groupSelect = $('<select class="ui-filtereditor-group-select"><option>and</option><option>or</option></select>');

		this.toolbar = this._createToolbar().appendTo(this.element);
		this.toolbar.on('click', '.ui-filtereditor-toolbutton', function(event) {
			self._toolbuttonClicked(self.hoveringNode, $(event.currentTarget));
		});

		if (!$.isPlainObject(this.options.dummyCondition)) {
			this._setOption('dummyCondition', {
				key: this.options.keys[0],
				condition: '=',
				value: ''
			});
		}

		if (!$.isPlainObject(this.options.filter)) {
			this.options.filter = {
				group: 'and',
				members: [ this.options.dummyCondition ]
			};
		}

		this._commitFilter();

		this.element.on('mouseenter', '.ui-filtereditor-comparison-node', function(event) {
			var node = $(event.currentTarget);
			if (node != self.hoveringNode)
			{
				if (self.hoveringNode) self.hoveringNode.removeClass('ui-filtereditor-hover-node');
				if (node.parents('.ui-filtereditor-node').length == 0)
				{
					// top level group cannot be changed
					self.toolbar.hide();
					self.hoveringNode = null;
				}
				else
				{
					self.toolbar.show().appendTo(node).position({
						of: node, at: 'right middle', my: 'right middle', offset: '0 0'
					});
					self.hoveringNode = node;
					self.hoveringNode.addClass('ui-filtereditor-hover-node');
				}
			}
		});
		this.element.on('mouseleave', '.ui-filtereditor-node', function(event) {
			if (self.hoveringNode) self.hoveringNode.removeClass('ui-filtereditor-hover-node');
			self.toolbar.hide();
			self.hoveringNode = null;
		});
		this.element.on('change', 'select', $.proxy(this._filterChanged, this));
		this.element.on('input keydown keyup paste', 'input', $.proxy(this._filterChanged, this));

	},

	_createToolbar: function()
	{
		var result = $('<div>').addClass('ui-filtereditor-toolbar');
		var buttons = [
			['move-up', 'ui-icon-carat-1-n'],
			['move-down', 'ui-icon-carat-1-s'],
			['condition-add', 'ui-icon-plusthick'],
			['condition-addgroup', 'ui-icon-folder-open'],
			['condition-delete', 'ui-icon-minusthick']
		];
		$.each(buttons, function(i, item) {
			var button = $('<button>').button({icons: { primary: item[1] }});
			button.addClass('ui-filtereditor-toolbutton ui-filtereditor-' + item[0]);
			button.appendTo(result);
		});
		return result;
	},

	_commitFilter: function()
	{
		this.root = this.createElementFromNode(this.options.filter);
		this.toolbar.hide().appendTo(this.element);
		this.element.find('.ui-filtereditor-node').remove();
		this.element.append(this.root);
	},

	_filterChanged: function()
	{
		this.toolbar.hide();
		this.options.filter = this.createNodeFromElement(this.root);
		this.element.trigger('filterchange');
	},

	_toolbuttonClicked: function(node, button)
	{
		if (!node || !button.is('button')) return;
		if (button.is('.ui-filtereditor-move-up')) {
			var prev = node.prev('.ui-filtereditor-node');
			if (prev) {
				node.insertBefore(prev);
				this._filterChanged();
			}
		}
		if (button.is('.ui-filtereditor-move-down')) {
			var next = node.next('.ui-filtereditor-node');
			if (next) {
				node.insertAfter(next);
				this._filterChanged();
			}
		}
		if (button.is('.ui-filtereditor-condition-add')) {
			var newElement = this.createElementFromNode(this.options.dummyCondition);
			if (node.is('.ui-filtereditor-group-node')) {
				newElement.appendTo(node);
			} else {
				newElement.insertAfter(node);
			}
			this._filterChanged();
		}
		if (button.is('.ui-filtereditor-condition-addgroup')) {
			var newElement = this.createElementFromNode({ group: 'and', members: [this.options.dummyCondition]});
			if (node.is('.ui-filtereditor-group-node')) {
				newElement.appendTo(node);
			} else {
				newElement.insertAfter(node);
			}
			this._filterChanged();
		}
		if (button.is('.ui-filtereditor-condition-delete')) {
			if (node.is('.ui-filtereditor-comparison-node')) {
				// if this is the only node in a group, delete enclosing group instead
				if (node.siblings('.ui-filtereditor-node').length == 0) {
					var group = node.parent('.ui-filtereditor-group-node');
					this._toolbuttonClicked(group, button);
					return;
				}
			}
			if (node.get()[0] == this.root.get()[0]) {
				// if the target is the top-level group, do nothing
				return;
			}
			this.toolbar.hide().appendTo(this.element);
			node.remove();
			this._filterChanged();
		}
	},

	_setOption: function(key, value)
	{
		$.Widget.prototype._setOption.apply(this, arguments);
		switch (key)
		{
			case 'filter':
				this._commitFilter();
				break;
		}
	},

	createElementFromNode: function(node)
	{
		var self = this;

		function createElementFromGroupNode(node)
		{
			var elem = $('<div>').addClass('ui-filtereditor-group-node ui-filtereditor-node');
			var max = node.members.length;
			self.groupSelect.clone().val(node.group).appendTo(elem);
			for (var i = 0; i < max; i++)
			{
				var child = self.createElementFromNode(node.members[i]);
				child.appendTo(elem);
			}
			elem.sortable({
				axis: 'y',
				start: function() { self.toolbar.hide(); },
				update: $.proxy(self._filterChanged, self),
				items: '> .ui-filtereditor-node'
			});
			return elem;
		}

		function createElementFromComparisonNode(node)
		{
			var elem = $('<div>').addClass('ui-filtereditor-comparison-node ui-filtereditor-node');
			var value = $('<input type="text" class="ui-filtereditor-value">').val(node.value);
			var tmpKey = self.keySelect.clone().val([node.key]);
			var tmpOp = self.opSelect.clone().val([node.condition]);
			elem.append(tmpKey, tmpOp, value);
			return elem;
		}

		if (node.members instanceof Array)
			return createElementFromGroupNode(node);
		else if (node.key !== undefined)
			return createElementFromComparisonNode(node);
		else
			throw new Exception();
	},

	createNodeFromElement: function(element)
	{
		function createNodeFromGroupElement(element)
		{
			var members = [];
			element.children('.ui-filtereditor-node').each(function() {
				var item = self.createNodeFromElement($(this));
				if (item != null)
					members.push(item);
			});
			var groupType = $('.ui-filtereditor-group-select', element).val();
			if (members.length > 0)
				return { group: groupType, members: members };
			else
				return null;
		}

		function createNodeFromComparisonElement(element)
		{
			return {
				key: element.find('.ui-filtereditor-key-select').val(),
				condition: element.find('.ui-filtereditor-operation-select').val(),
				value: element.find('.ui-filtereditor-value').val()
			};
		}

		var self = this;
		if (element.is('.ui-filtereditor-group-node'))
			return createNodeFromGroupElement(element);
		else if (element.is('.ui-filtereditor-comparison-node'))
			return createNodeFromComparisonElement(element);
		else
			throw "exception";
	},

	createMongoCondFromElement: function(element)
	{
		function createNodeFromGroupElement(element)
		{
			var members = [];
			element.children('.ui-filtereditor-node').each(function() {
				var item = self.createMongoCondFromElement($(this));
				if (item != null)
					members.push(item);
			});
			var groupType = $('.ui-filtereditor-group-select', element).val();
			if (members.length > 0) {
				if (groupType == 'and') return {$and: members};
				if (groupType == 'or') return {$or: members};
			} else {
				return null;
			}
		}

		function escapeRegex(str)
		{
			return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
		}

		function createNodeFromComparisonElement(element)
		{
			var result = {};
			var key = element.find('.ui-filtereditor-key-select').val();
			var cond = element.find('.ui-filtereditor-operation-select').val();
			var value = element.find('.ui-filtereditor-value').val();
			switch(cond) {
				case '=':
					result[key] = value;
					break;
				case '>':
					result[key] = {$gt: value};
					break;
				case '<':
					result[key] = {$lt: value};
					break;
				case '>=':
					result[key] = {$gte: value};
					break;
				case '<=':
					result[key] = {$lte: value};
					break;
				case '!=':
					result[key] = {$ne: value};
					break;
				case '*=':
					result[key] = {$regex: escapeRegex(value)};
					break;
				case '^=':
					result[key] = {$regex: '^' + escapeRegex(value)};
					break;
				case '$=':
					result[key] = {$regex: escapeRegex(value) + '$'};
					break;
			}
			return result;
		}

		var self = this;
		if (!element) element = self.root;
		if (element.is('.ui-filtereditor-group-node'))
			return createNodeFromGroupElement(element);
		else if (element.is('.ui-filtereditor-comparison-node'))
			return createNodeFromComparisonElement(element);
		else
			throw "exception";
	}
});