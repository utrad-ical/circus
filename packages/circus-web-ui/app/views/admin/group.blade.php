@extends('admin.base')
@section('admin-content')
    <script>
        var privileges = {{json_encode(Group::$privilegeList)}} ;

        $(function () {
            adminEditor.run({
                resource: 'group',
                primaryKey: 'groupID',
                captionKey: 'groupName',
                listColumns: [
                    {key: 'groupName', label: 'Group Name'},
                    {
                        label: 'Privileges',
                        data: function (item) {
                            return item.privileges.map(function(priv) {
                                return $('<span>').addClass('badge').text(priv);
                            });
                        }
                    }
                ],
                form: [
                    {caption: 'Group Name', key: 'groupName', type: 'text'},
                    {
                        caption: 'Roles',
                        key: 'privileges',
                        type: 'checkboxgroup',
                        spec: {
                            options: privileges.map(function(p) { return p.privilege + ':' + p.caption; }),
                            vertical: true
                        }
                    }
                ]
            });
        });
    </script>
@stop
