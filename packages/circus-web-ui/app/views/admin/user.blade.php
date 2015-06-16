@extends('admin.base')
@section('admin-content')
    <script>
        $(function () {
            // query group data
            $.getJSON('/api/group').then(function (groups) {
                var groupIdMap = {};
                groups = groups.map(function (group) {
                    groupIdMap[group.groupID] = group;
                    return group.groupID + ':' + group.groupName;
                });

                adminEditor.run({
                    resource: 'user',
                    primaryKey: 'userEmail',
                    captionKey: 'loginID',
                    listColumns: [
                        {key: 'loginID', label: 'Login Name'},
                        {key: 'description', label: 'Description'},
                        {
                            data: function (item) {
                                return item.groups.map(function (groupID) {
                                    return $('<span>').addClass('badge')
                                            .text(groupIdMap[groupID].groupName);
                                });
                            },
                            label: 'Groups'
                        }
                    ],
                    form: [
                        {caption: 'User Email', key: 'userEmail', type: 'text'},
                        {caption: 'Login Name', key: 'loginID', type: 'text'},
                        {caption: 'Description', key: 'description', type: 'text'},
                        {caption: 'Password', key: 'password', type: 'password'},
                        {
                            caption: 'Groups',
                            key: 'groups',
                            type: 'selectmultiple',
                            spec: {options: groups, valueType: 'number'}
                        },
                        {
                            caption: 'Theme', key: 'preferences.theme', type: 'radio', spec: {
                            options: ['mode_white:White', 'mode_black:Black']
                        }
                        },
                        {caption: 'Show personal info', key: 'preferences.personalInfoView', type: 'checkbox'},
                        {caption: 'Login Enabled', key: 'loginEnabled', type: 'checkbox'}
                    ],
                    beforeEdit: function () {
                        var select = $('select.ui-tf-select');
                        if (!select.is('.ui-multiselect')) {
                            select.multiselect({
                                header: false, selectedList: 99
                            });
                        }
                        select.multiselect('refresh');
                    }
                });
            });
        });
    </script>
@stop
