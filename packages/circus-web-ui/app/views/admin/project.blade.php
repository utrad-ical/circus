@extends('admin.base')
@section('admin-content')
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
                        {key: 'projectName', label: 'Project Name'}
                    ],
                    form: [
                        {caption: 'Project Name', key: 'projectName', type: 'text'},
                        groupProperty('viewGroups', 'View Groups'),
                        groupProperty('createGroups', 'Create Groups'),
                        groupProperty('updateGroups', 'Update Groups'),
                        groupProperty('reviewGroups', 'Review Groups'),
                        groupProperty('deleteGroups', 'Delete Groups'),
                        groupProperty('personalInfoViewGroups', 'Personal Info View Groups'),
                        {
                            caption: 'Window Priority',
                            key: 'windowPriority',
                            type: 'select',
                            spec: {options: [
                                'dicom,preset,auto', 'dicom,auto,preset',
                                'preset,dicom,auto', 'preset,auto,dicom',
                                'auto,dicom,preset', 'auto,preset,dicom'
                            ]}
                        },
                        {caption: 'Window Presets', key: 'windowPresets', type: 'json'},
                        {caption: 'Label Attributes', key: 'labelAttributesSchema', type: 'json'},
                        {caption: 'Case Attributes', key: 'caseAttributesSchema', type: 'json'}
                    ],
                    beforeEdit: function () {
                        var select = $('select.ui-tf-select[multiple]');
                        if (!select.is('.ui-multiselect')) {
                            select.multiselect({
                                header: false, selectedList: 99, noneSelectedText: '(None)'
                            });
                        }
                        select.multiselect('refresh');
                    }
                });
            });
        });
    </script>
@stop
