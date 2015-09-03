@extends('admin.base')

@section('head')
@parent
{{HTML::script('js/case-tag.js')}}
@stop

@section('admin-content')
    <style>
        #tag-editor-list > li { margin-bottom: 2px; }
    </style>
    <script>
        $(function () {
            $.getJSON('/api/group').then(function (groups) {
                var groupIdMap = {};
                groups = groups.map(function (group) {
                    groupIdMap[group.groupID] = group;
                    return group.groupID + ':' + group.groupName;
                });

                function groupProperty(key, caption) {
                    return {
                        caption: caption,
                        key: key,
                        type: 'selectmultiple',
                        spec: {options: groups, valueType: 'number'}
                    };
                }

                adminEditor.run({
                    resource: 'project',
                    primaryKey: 'projectID',
                    captionKey: 'projectName',
                    listColumns: [
                        {key: 'projectID', label: 'Project ID'},
                        {key: 'projectName', label: 'Project Name'},
                        {key: 'description', label: 'Description'}
                    ],
                    form: [
                        {heading: 'Project Schema (May be shared)'},
                        {caption: 'Project Name', key: 'projectName', type: 'text'},
                        {caption: 'Description', key: 'description', type: 'text'},
                        {
                            caption: 'Window Priority',
                            key: 'windowPriority',
                            type: 'select',
                            spec: {options: [
                                'dicom,preset,auto', 'dicom,auto',
                                'preset,dicom,auto', 'preset,auto',
                                'auto'
                            ]}
                        },
                        {caption: 'Window Presets', key: 'windowPresets', type: 'list', spec: {
                            elementType: 'form',
                            elementSpec: {
                                form: $('#template .window-preset'),
                                filter: function(data) {
                                    data.width = parseInt(data.width);
                                    data.level = parseInt(data.level);
                                    return data;
                                }
                            }
                        }},
                        {caption: 'Label Attributes', key: 'labelAttributesSchema', type: 'json'},
                        {caption: 'Case Attributes', key: 'caseAttributesSchema', type: 'json'},

                        {heading: 'Project Privilege (Not shared)'},
                        groupProperty('readGroups', 'Read Groups'),
                        groupProperty('addSeriesGroups', 'Add Series Groups'),
                        groupProperty('writeGroups', 'Write Groups'),
                        groupProperty('moderateGroups', 'Moderate Groups'),
                        groupProperty('viewPersonalInfoGroups', 'View Personal Info Groups'),
                        {caption: 'Tags', key: 'tags', type: 'callback', spec: {
                            edit: editTag, render: renderTag
                        }}
                    ],
                    beforeEdit: function () {
                        var select = $('select.ui-tf-select[multiple]');
                        if (!select.is('.ui-multiselect')) {
                            select.multiselect({
                                header: false, selectedList: 99, noneSelectedText: '(None)'
                            });
                        }
                        select.multiselect('refresh');
                    },
                    postDrawListRow: function (row, item) {
                        var cell = $('td:last', row);
                        var button = $('<button>').addClass('common_btn share').text('Share').appendTo(cell);
                        cell.append(' ').append(button);
                    }
                });
            });

            $('#list').on('click', 'button.share', function () {
                //
            });

            function newWrappedTag(tag) {
                var container = $('<li>');
                var tag = $('<div>').text(tag.name).tag(tag.color).prop('contenteditable', true);
                var remove = $('<span style="display: inline-block">').addClass('ui-icon ui-icon-close').on('click', function () {
                    container.remove();
                });
                var color = $('<span style="display: inline-block">').addClass('ui-icon ui-icon-calculator')
                    .simpleColorPicker().on('change', function(event) {
                        tag.tag($(event.target).data('color'));
                    });
                return container.append(tag, remove, color);
            }

            $('#tag-editor-add').click(function() {
                newWrappedTag({ name: 'tag', color: '#880000' }).appendTo('#tag-editor-list');
            });

            function editTag(data, callback) {
                var list = $('#tag-editor-list').empty();
                if ($.isArray(data)) data.forEach(function(tag) { list.append(newWrappedTag(tag)); });

                function rgb2hex(rgb) {
                    if (/^\#[0-9a-f]{6}$/i.test(rgb)) return rgb.toLowerCase();
                    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                    function hex(x) {
                        return ("0" + parseInt(x).toString(16)).slice(-2);
                    }
                    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
                }

                $('#tag-editor').dialog({
                    modal: true,
                    close: function () {
                        var tags = [];
                        $('#tag-editor-list .tag').each(function() {
                            var tag = $(this);
                            tags.push({ name: tag.text(), color: rgb2hex(tag.css('background-color')) });
                        });
                        callback(tags);
                    }
                });
            }

            function renderTag(div, data) {
                div.empty();
                if (!data) return;
                data.forEach(function(tag) {
                    $('<div>').text(tag.name).tag(tag.color).appendTo(div);
                });
            }

        });
    </script>
    @if(!Auth::user()->hasPrivilege(Group::PROJECT_CREATE))
    <script>
        $(function(){
            $('#new').hide();
        });
    </script>
    @endif
    <div id="template" style="display: none">
        <span class="window-preset">
            <label>
                Preset Name: <input type="text" name="label" size="10" />
                WL: <input type="text" name="level" size="5" />
                WW: <input type="text" name="width" size="5" />
            </label>
        </span>
    </div>
    <div id="tag-editor" style="display: none;" title="Edit Tags">
        <ul id="tag-editor-list"></ul>
        <button id="tag-editor-add">Add New Tag</button>
    </div>
@stop
