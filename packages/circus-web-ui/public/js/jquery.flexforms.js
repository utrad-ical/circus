/// <reference path="types/jquery/jquery.d.ts" />
/// <reference path="types/jqueryui/jqueryui.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var typedFieldWidget;
(function (typedFieldWidget) {
    typedFieldWidget.options = {
        type: 'text',
        spec: {}
    };
    function _create() {
        createInput.call(this);
    }
    typedFieldWidget._create = _create;
    function createInput() {
        var _this = this;
        var map = {
            text: 'TextInput',
            number: 'NumberInput',
            select: 'Select',
            date: 'DatePicker',
            checkbox: 'CheckBox',
            radio: 'RadioGroup'
        };
        this.element.empty();
        this.element.addClass('ui-typedfield');
        if (!(this.options.type in map)) {
            throw 'Undefined field type';
        }
        this.field = new typedField[map[this.options.type]](this.options.spec);
        var elem = this.field.createElement();
        if ('value' in this.options) {
            this.field.set(this.options.value);
        }
        else if ('default' in this.options.spec) {
            this.field.set(this.options.spec.default);
        }
        _validate.call(this);
        this.field.changed = function () {
            _validate.call(_this);
            _this.element.trigger('valuechange', [_this.field]);
        };
        elem.appendTo(this.element);
    }
    function _validate() {
        var valid = this.field.valid();
        this.element.toggleClass('ui-typedfield-invalid', !valid);
        this.options.value = valid ? this.field.get() : null;
    }
    function enable() {
        this.field.enable();
        this.options.disabled = false;
    }
    typedFieldWidget.enable = enable;
    function disable() {
        this.field.disable();
        this.options.disabled = true;
    }
    typedFieldWidget.disable = disable;
    function getValue() {
        return this.options.value;
    }
    typedFieldWidget.getValue = getValue;
    function valid() {
        return this.field.valid();
    }
    typedFieldWidget.valid = valid;
    function setValue(value) {
        this.field.set(value);
        _validate.call(this);
    }
    typedFieldWidget.setValue = setValue;
    function _setOption(key, value) {
        switch (key) {
            case 'type':
                this.options.type = value;
                createInput.call(this);
                break;
            case 'spec':
                this.options.spec = value;
                createInput.call(this);
                break;
            case 'value':
                setValue.call(this, value);
                break;
            case 'disabled':
                if (!!(value)) {
                    this.enable();
                }
                else {
                    this.disable();
                }
                break;
            default:
                this._super(key, value);
        }
    }
    typedFieldWidget._setOption = _setOption;
})(typedFieldWidget || (typedFieldWidget = {}));
var typedField;
(function (typedField) {
    var Base = (function () {
        function Base(spec) {
            this.spec = $.extend({}, spec);
        }
        Base.prototype.splitKeyLabel = function (input) {
            var m = null;
            if (m = input.match(/^(.+?)\:(.+)$/)) {
                return [m[1], m[2]];
            }
            else {
                return [input, input];
            }
        };
        Base.prototype.assignSpecsToElementProp = function (keys) {
            var _this = this;
            $.each(keys, function (i, key) {
                if (key in _this.spec)
                    _this.element.prop(key, _this.spec[key]);
            });
        };
        Base.prototype.triggerChanged = function () {
            if (typeof this.changed === 'function') {
                this.changed();
            }
        };
        Base.prototype.createElement = function () {
            return null;
        };
        Base.prototype.enable = function () {
        };
        Base.prototype.disable = function () {
        };
        Base.prototype.disabled = function () {
            return false;
        };
        Base.prototype.valid = function () {
            return true;
        };
        Base.prototype.get = function () {
        };
        Base.prototype.set = function (value) {
        };
        return Base;
    })();
    typedField.Base = Base;
    var HtmlInputInput = (function (_super) {
        __extends(HtmlInputInput, _super);
        function HtmlInputInput() {
            _super.apply(this, arguments);
        }
        HtmlInputInput.prototype.get = function () {
            return this.element.val();
        };
        HtmlInputInput.prototype.set = function (value) {
            this.element.val(value);
        };
        HtmlInputInput.prototype.enable = function () {
            this.element.prop('disabled', false);
        };
        HtmlInputInput.prototype.disable = function () {
            this.element.prop('disabled', true);
        };
        HtmlInputInput.prototype.disabled = function () {
            return this.element.prop('disabled');
        };
        return HtmlInputInput;
    })(Base);
    typedField.HtmlInputInput = HtmlInputInput;
    var TextInput = (function (_super) {
        __extends(TextInput, _super);
        function TextInput() {
            _super.apply(this, arguments);
        }
        TextInput.prototype.createElement = function () {
            var _this = this;
            this.element = $('<input type="text">').addClass('ui-typedfield-text');
            this.assignSpecsToElementProp(['placeholder', 'length']);
            this.element.on('change input keyup', function (event) {
                _this.triggerChanged();
                event.stopPropagation();
            });
            return this.element;
        };
        TextInput.prototype.valid = function () {
            if ('regex' in this.spec) {
                var match = this.element.val().match(this.spec.regex);
                return !!match;
            }
            return true;
        };
        return TextInput;
    })(HtmlInputInput);
    typedField.TextInput = TextInput;
    var NumberInput = (function (_super) {
        __extends(NumberInput, _super);
        function NumberInput() {
            _super.apply(this, arguments);
            this.html5 = null;
        }
        NumberInput.prototype.htmlNumberSupported = function () {
            if (NumberInput.numberSupported === null) {
                var tmp = $('<input type="number">');
                NumberInput.numberSupported = tmp.prop('type') === 'number'; // supported!
            }
            return NumberInput.numberSupported;
        };
        NumberInput.prototype.valid = function () {
            var val = this.element.val();
            if (!val.match(/^-?(0|[1-9]\d*)(\.\d+)?$/))
                return false;
            if ('min' in this.spec && this.spec.min > val)
                return false;
            if ('max' in this.spec && this.spec.max < val)
                return false;
            if (!this.spec.float && val.match(/\./))
                return false;
            return true;
        };
        NumberInput.prototype.get = function () {
            if (this.spec.float === true) {
                return parseFloat(this.element.val());
            }
            else {
                return parseInt(this.element.val());
            }
        };
        NumberInput.prototype.set = function (value) {
            this.element.val(parseInt(value).toString());
        };
        NumberInput.prototype.createElement = function () {
            var _this = this;
            this.element = $('<input>');
            var useHtml5 = this.htmlNumberSupported && this.spec.html5 !== false;
            this.element.prop('type', useHtml5 ? 'number' : 'text');
            this.assignSpecsToElementProp(['placeholder', 'min', 'max', 'step']);
            this.element.on('change input keyup', function () {
                _this.triggerChanged();
                event.stopPropagation();
            });
            return this.element;
        };
        NumberInput.numberSupported = null;
        return NumberInput;
    })(HtmlInputInput);
    typedField.NumberInput = NumberInput;
    var Select = (function (_super) {
        __extends(Select, _super);
        function Select() {
            _super.apply(this, arguments);
        }
        Select.prototype.createElement = function () {
            var _this = this;
            this.element = $('<select>').addClass('ui-tf-select');
            this.element.on('change', function () {
                _this.triggerChanged();
            });
            if ($.isArray(this.spec.options)) {
                var options = this.spec.options;
                for (var i = 0; i < options.length; i++) {
                    var tmp = this.splitKeyLabel(options[i]);
                    $('<option>').prop('value', tmp[0]).text(tmp[1]).appendTo(this.element);
                }
            }
            return this.element;
        };
        Select.prototype.get = function () {
            switch (this.spec.valueType) {
                case 'number':
                    return parseFloat(this.element.val());
                case 'boolean':
                    return !!this.element.val();
                case 'string':
                default:
                    return this.element.val();
            }
        };
        return Select;
    })(HtmlInputInput);
    typedField.Select = Select;
    var RadioGroup = (function (_super) {
        __extends(RadioGroup, _super);
        function RadioGroup() {
            _super.apply(this, arguments);
        }
        RadioGroup.prototype.createElement = function () {
            var _this = this;
            this.element = $('<span>');
            if ($.isArray(this.spec.options)) {
                var options = this.spec.options;
                for (var i = 0; i < options.length; i++) {
                    var tmp = this.splitKeyLabel(options[i]);
                    var radio = $('<input type="radio">').prop('value', tmp[0]);
                    $('<label>').append(radio).append(tmp[1]).appendTo(this.element);
                }
                this.element.on('click', '> label > :radio', function (event) {
                    _this.element.find('> label > :radio').each(function (i, radio) {
                        if (event.target !== radio)
                            $(radio).prop('checked', false);
                    });
                    _this.triggerChanged();
                });
            }
            return this.element;
        };
        RadioGroup.prototype.disable = function () {
            this.element.find('> label > :radio').prop('disabled', true);
        };
        RadioGroup.prototype.enable = function () {
            this.element.find('> label > :radio').prop('disabled', false);
        };
        RadioGroup.prototype.valid = function () {
            return this.element.find('> label > :radio:checked').length > 0;
        };
        RadioGroup.prototype.get = function () {
            return this.element.find('> label > :radio:checked').val();
        };
        RadioGroup.prototype.set = function (value) {
            this.element.find('> label > :radio').each(function (i, radio) {
                $(radio).prop('checked', $(radio).val() == value);
            });
        };
        return RadioGroup;
    })(Base);
    typedField.RadioGroup = RadioGroup;
    var DatePicker = (function (_super) {
        __extends(DatePicker, _super);
        function DatePicker() {
            _super.apply(this, arguments);
        }
        DatePicker.prototype.createElement = function () {
            var _this = this;
            this.element = $('<input>').datepicker({
                dateFormat: 'yy-mm-dd',
                onSelect: function () { return _this.triggerChanged(); }
            });
            return this.element;
        };
        DatePicker.prototype.enable = function () {
            this.element.datepicker('enable');
        };
        DatePicker.prototype.disable = function () {
            this.element.datepicker('disable');
        };
        DatePicker.prototype.disabled = function () {
            return this.element.datepicker('disabled');
        };
        DatePicker.prototype.get = function () {
            return this.element.val();
        };
        DatePicker.prototype.set = function (value) {
            this.element.datepicker('setDate', value);
        };
        return DatePicker;
    })(Base);
    typedField.DatePicker = DatePicker;
    var CheckBox = (function (_super) {
        __extends(CheckBox, _super);
        function CheckBox() {
            _super.apply(this, arguments);
        }
        CheckBox.prototype.createElement = function () {
            var _this = this;
            this.element = $('<label>');
            this.checkbox = $('<input>').attr('type', 'checkbox').appendTo(this.element);
            if ('label' in this.spec && typeof this.spec.label == 'string') {
                this.element.append(this.spec.label);
            }
            this.checkbox.on('change', function () {
                _this.triggerChanged();
            });
            return this.element;
        };
        CheckBox.prototype.enable = function () {
            this.checkbox.prop('disabled', false);
        };
        CheckBox.prototype.disable = function () {
            this.checkbox.prop('disabled', true);
        };
        CheckBox.prototype.disabled = function () {
            return this.checkbox.prop('disabled');
        };
        CheckBox.prototype.get = function () {
            return this.checkbox.prop('checked');
        };
        CheckBox.prototype.set = function (value) {
            this.checkbox.prop('checked', !!value);
        };
        return CheckBox;
    })(Base);
    typedField.CheckBox = CheckBox;
})(typedField || (typedField = {}));
$.widget("ui.typedfield", typedFieldWidget);
/// <reference path="types/jquery/jquery.d.ts" />
/// <reference path="types/jqueryui/jqueryui.d.ts" />
/// <reference path="jquery.typedfield.ts" />
var propertyEditorWidget;
(function (propertyEditorWidget) {
    propertyEditorWidget.options = {
        properties: [],
        value: {},
        useCaptions: true
    };
    function _create() {
        _refreshForm.call(this);
    }
    propertyEditorWidget._create = _create;
    function _refreshForm() {
        var _this = this;
        var props = this.options.properties;
        this.element.empty().addClass('ui-propertyeditor');
        var table = $('<table>').addClass('ui-propertyeditor-table').appendTo(this.element);
        this.fields = {};
        $.each(props, function (i, prop) {
            if (prop.key in _this.fields) {
                return;
            }
            var row = $('<tr>').addClass('ui-propertyeditor-row');
            var caption = $('<th>').addClass('ui-propertyeditor-caption').text(prop.caption);
            var editor = $('<td>').addClass('ui-propertyeditor-column').typedfield({ type: prop.type, spec: prop.spec }).on('valuechange', function (event) {
                _this.options.value[prop.key] = $(event.target).typedfield('getValue');
            });
            row.append(caption).append(editor).appendTo(table);
            _this.fields[prop.key] = editor;
        });
        _assignValues.call(this, this.options.value);
        if (this.options.disabled) {
            disable.call(this);
        }
    }
    function enable() {
        this.element.find('.ui-propertyeditor-column').typedfield('enable');
        this.options.disabled = false;
    }
    propertyEditorWidget.enable = enable;
    function disable() {
        this.element.find('.ui-propertyeditor-column').typedfield('disable');
        this.options.disabled = true;
    }
    propertyEditorWidget.disable = disable;
    function _setOption(key, value) {
        switch (key) {
            case 'value':
                _assignValues.call(this, value);
                break;
            case 'disabled':
                if (!!value) {
                    this.disable();
                }
                else {
                    this.enable();
                }
                break;
            default:
                this._super(key, value);
        }
    }
    propertyEditorWidget._setOption = _setOption;
    function _refreshValues() {
        var _this = this;
        this.options.value = {};
        var props = this.options.properties;
        $.each(props, function (i, prop) {
            var field = _this.fields[prop.key];
            _this.options.value[prop.key] = field.typedfield('valid') ? field.typedfield('getValue') : null;
        });
    }
    function _assignValues(value) {
        for (var key in value) {
            if (typeof this.fields[key] === 'object') {
                this.fields[key].typedfield('setValue', value[key]);
            }
        }
        _refreshValues.call(this);
    }
})(propertyEditorWidget || (propertyEditorWidget = {}));
$.widget("ui.propertyeditor", propertyEditorWidget);
/// <reference path="types/jquery/jquery.d.ts" />
/// <reference path="types/jqueryui/jqueryui.d.ts" />
/// <reference path="jquery.typedfield.ts" />
var filterEditor;
(function (filterEditor) {
    filterEditor.options = {
        keys: [{ key: 'name', type: 'text' }, { key: 'age', type: 'number' }]
    };
    var _typeOpMap = {
        text: [
            { op: '=', label: 'is' },
            { op: '!=', label: 'is not' },
            { op: '*=', label: 'contains' },
            { op: '^=', label: 'begins with' },
            { op: '$=', label: 'ends with' }
        ],
        number: [
            { op: '=', label: '=' },
            { op: '>', label: '>' },
            { op: '<', label: '<' },
            { op: '>=', label: '>=' },
            { op: '<=', label: '<=' }
        ],
        select: [
            { op: '=', label: 'is' },
            { op: '!=', label: 'is not' }
        ],
        date: [
            { op: '=', label: 'is' },
            { op: '>', label: '>' },
            { op: '<', label: '<' },
            { op: '>=', label: '>=' },
            { op: '<=', label: '<=' }
        ]
    };
    function _create() {
        var _this = this;
        var options = this.options;
        this.element.empty();
        var keySelect = $('<select>').addClass('ui-filtereditor-key-select');
        var keys = options.keys;
        this.keymap = {};
        $.each(keys, function (i, keydef) {
            if (!(keydef.type in _typeOpMap))
                throw 'Unsupported key type';
            var label = keydef.key.replace('_', ' ');
            if ('label' in keydef)
                label = keydef.label;
            $('<option>').attr('value', keys[i].key).text(label).appendTo(keySelect);
            _this.keymap[keydef.key] = keydef;
        });
        this.keySelect = keySelect;
        this.groupSelect = $('<select class="ui-filtereditor-group-select"><option>and</option><option>or</option></select>');
        this.toolbar = _createToolbar().appendTo(this.element);
        this.toolbar.on('click', '.ui-filtereditor-toolbutton', $.proxy(_toolButtonClicked, this));
        if (!$.isPlainObject(options.dummyCondition)) {
            this._setOption('dummyCondition', {
                key: options.keys[0].key,
                condition: '=',
                value: ''
            });
        }
        if (!$.isPlainObject(options.filter)) {
            options.filter = {
                group: 'and',
                members: [this.options.dummyCondition]
            };
        }
        _commitFilter.call(this);
        this.element.on('mouseenter', '.ui-filtereditor-comparison-node', function (event) { return nodeMouseEnter.call(_this, event); });
        this.element.on('mouseleave', '.ui-filtereditor-node', function (event) { return nodeMouseLeave.call(_this, event); });
        this.element.on('valuechange change', $.proxy(_filterChanged, this));
    }
    filterEditor._create = _create;
    function nodeMouseEnter(event) {
        var node = $(event.currentTarget);
        if (node != this.hoveringNode) {
            if (this.hoveringNode)
                this.hoveringNode.removeClass('ui-filtereditor-hover-node');
            if (node.parents('.ui-filtereditor-node').length == 0) {
                // top level group cannot be changed
                this.toolbar.hide();
                this.hoveringNode = null;
            }
            else {
                this.toolbar.show().appendTo(node).position({
                    of: node,
                    at: 'right middle',
                    my: 'right middle',
                    offset: '0 0'
                });
                this.hoveringNode = node;
                this.hoveringNode.addClass('ui-filtereditor-hover-node');
            }
        }
    }
    function nodeMouseLeave(event) {
        if (this.hoveringNode)
            this.hoveringNode.removeClass('ui-filtereditor-hover-node');
        this.toolbar.hide();
        this.hoveringNode = null;
    }
    function _createToolbar() {
        var result = $('<div>').addClass('ui-filtereditor-toolbar');
        var buttons = [
            ['move-up', 'ui-icon-carat-1-n'],
            ['move-down', 'ui-icon-carat-1-s'],
            ['condition-add', 'ui-icon-plusthick'],
            ['condition-addgroup', 'ui-icon-folder-open'],
            ['condition-delete', 'ui-icon-minusthick']
        ];
        $.each(buttons, function (i, item) {
            var button = $('<button>').button({ icons: { primary: item[1] } });
            button.addClass('ui-filtereditor-toolbutton ui-filtereditor-' + item[0]);
            button.appendTo(result);
        });
        return result;
    }
    function _commitFilter() {
        this.root = createElementFromNode(this, this.options.filter);
        this.toolbar.hide().appendTo(this.element);
        this.element.find('.ui-filtereditor-node').remove();
        this.element.append(this.root);
    }
    function _filterChanged() {
        this.toolbar.hide();
        this.options.filter = createNodeFromElement(this.root);
        this.element.trigger('filterchange');
    }
    function _toolButtonClicked(event) {
        var node = this.hoveringNode;
        var button = $(event.currentTarget);
        if (!node || !button.is('button'))
            return;
        if (button.is('.ui-filtereditor-move-up')) {
            var prev = node.prev('.ui-filtereditor-node');
            if (prev) {
                node.insertBefore(prev);
                _filterChanged.call(this);
            }
        }
        if (button.is('.ui-filtereditor-move-down')) {
            var next = node.next('.ui-filtereditor-node');
            if (next) {
                node.insertAfter(next);
                _filterChanged.call(this);
            }
        }
        if (button.is('.ui-filtereditor-condition-add')) {
            var newElement = createElementFromNode(this, this.options.dummyCondition);
            if (node.is('.ui-filtereditor-group-node')) {
                newElement.appendTo(node);
            }
            else {
                newElement.insertAfter(node);
            }
            _filterChanged.call(this);
        }
        if (button.is('.ui-filtereditor-condition-addgroup')) {
            var newElement = createElementFromNode(this, { group: 'and', members: [this.options.dummyCondition] });
            if (node.is('.ui-filtereditor-group-node')) {
                newElement.appendTo(node);
            }
            else {
                newElement.insertAfter(node);
            }
            _filterChanged.call(this);
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
            _filterChanged.call(this);
        }
    }
    function _setOption(key, value) {
        $.Widget.prototype._setOption.apply(this, arguments);
        switch (key) {
            case 'filter':
                _commitFilter.call(this);
                break;
            case 'keys':
                throw 'Keys must be initialized at create time';
        }
    }
    filterEditor._setOption = _setOption;
    function createElementFromNode(widget, node) {
        var self = widget;
        function createElementFromGroupNode(node) {
            var elem = $('<div>').addClass('ui-filtereditor-group-node ui-filtereditor-node');
            self.groupSelect.clone().val(node.group).appendTo(elem);
            $.each(node.members, function (i, member) {
                var child = createElementFromNode(self, member);
                child.appendTo(elem);
            });
            elem.sortable({
                axis: 'y',
                start: function () {
                    self.toolbar.hide();
                },
                update: $.proxy(_filterChanged, self),
                items: '> .ui-filtereditor-node'
            });
            return elem;
        }
        function createTypedFieldAndOperatorSelector(selectedKey, currentValue) {
            var op = $('<select>').addClass('ui-filtereditor-operation-select');
            var keydef = this.keymap[selectedKey];
            $.each(_typeOpMap[keydef.type], function (i, opdef) {
                $('<option>').text(opdef.label).attr('value', opdef.op).appendTo(op);
            });
            var opt = { type: keydef.type, spec: keydef.spec };
            var value = $('<span>').addClass('ui-filtereditor-value').typedfield(opt);
            if (typeof currentValue !== 'undefined') {
                value.typedfield('option', 'value', currentValue);
            }
            return { op: op, value: value };
        }
        function createElementFromComparisonNode(node) {
            var elem = $('<div>').addClass('ui-filtereditor-comparison-node ui-filtereditor-node');
            var tmpKey = self.keySelect.clone().val([node.key]);
            var op_val = createTypedFieldAndOperatorSelector.call(self, node.key, node.value);
            op_val.value.val(node.condition);
            tmpKey.on('change', function (event) {
                $(event.target).siblings('.ui-filtereditor-operation-select, .ui-filtereditor-value').remove();
                var key = $(event.target).val();
                var op_val = createTypedFieldAndOperatorSelector.call(self, key, undefined);
                elem.append(op_val.op, op_val.value);
            });
            elem.append(tmpKey, op_val.op, op_val.value);
            return elem;
        }
        if (node.members instanceof Array)
            return createElementFromGroupNode(node);
        else if (node.key !== undefined)
            return createElementFromComparisonNode(node);
        else
            throw 'Error';
    }
    function createNodeFromElement(element) {
        function createNodeFromGroupElement(element) {
            var members = [];
            element.children('.ui-filtereditor-node').each(function () {
                var item = createNodeFromElement($(this));
                if (item != null)
                    members.push(item);
            });
            var groupType = $('.ui-filtereditor-group-select', element).val();
            if (members.length > 0)
                return { group: groupType, members: members };
            else
                return null;
        }
        function createNodeFromComparisonElement(element) {
            return {
                key: element.find('.ui-filtereditor-key-select').val(),
                condition: element.find('.ui-filtereditor-operation-select').val(),
                value: element.find('.ui-filtereditor-value').typedfield('option', 'value')
            };
        }
        if (element.is('.ui-filtereditor-group-node'))
            return createNodeFromGroupElement(element);
        else if (element.is('.ui-filtereditor-comparison-node'))
            return createNodeFromComparisonElement(element);
        else
            throw "exception";
    }
    function exportMongo(element) {
        var self = this;
        function createNodeFromGroupElement(element) {
            var members = [];
            element.children('.ui-filtereditor-node').each(function () {
                var item = self.exportMongo($(this));
                if (item != null)
                    members.push(item);
            });
            var groupType = $('.ui-filtereditor-group-select', element).val();
            if (members.length > 0) {
                if (groupType == 'and')
                    return { $and: members };
                if (groupType == 'or')
                    return { $or: members };
            }
            else {
                return null;
            }
        }
        function escapeRegex(str) {
            return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        }
        function createNodeFromComparisonElement(element) {
            var result = {};
            var key = element.find('.ui-filtereditor-key-select').val();
            var cond = element.find('.ui-filtereditor-operation-select').val();
            var value = element.find('.ui-filtereditor-value').typedfield('option', 'value');
            if (self.keymap[key].type === 'date') {
                var offset = -(new Date()).getTimezoneOffset();
                var sign = offset >= 0 ? '+' : '-';
                offset = Math.abs(offset);
                var hour = ('00' + Math.floor(offset / 60).toString()).slice(-2);
                var min = ('00' + (offset % 60).toString()).slice(-2);
                value = { '$date': value + 'T00:00:00' + sign + hour + ':' + min };
            }
            switch (cond) {
                case '=':
                    result[key] = value;
                    break;
                case '>':
                    result[key] = { $gt: value };
                    break;
                case '<':
                    result[key] = { $lt: value };
                    break;
                case '>=':
                    result[key] = { $gte: value };
                    break;
                case '<=':
                    result[key] = { $lte: value };
                    break;
                case '!=':
                    result[key] = { $ne: value };
                    break;
                case '*=':
                    result[key] = { $regex: escapeRegex(value) };
                    break;
                case '^=':
                    result[key] = { $regex: '^' + escapeRegex(value) };
                    break;
                case '$=':
                    result[key] = { $regex: escapeRegex(value) + '$' };
                    break;
            }
            return result;
        }
        if (!element)
            element = self.root;
        if (element.is('.ui-filtereditor-group-node'))
            return createNodeFromGroupElement(element);
        else if (element.is('.ui-filtereditor-comparison-node'))
            return createNodeFromComparisonElement(element);
        else
            throw "exception";
    }
    filterEditor.exportMongo = exportMongo;
})(filterEditor || (filterEditor = {}));
$.widget('ui.filtereditor', filterEditor);
// CIRCUS CS Flex Forms
// TypeScript based project -- Do not directly edit the JavaScript file.
//# sourceMappingURL=jquery.flexforms.js.map