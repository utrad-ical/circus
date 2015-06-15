@extends('admin.base')
@section('admin-content')
    <script>
        var privileges = {{json_encode(Group::$privilegeList)}} ;
        var domainMap = {{json_encode(array_keys(ServerParam::getDomainList()))}};
        $(function () {
        	var domains = domainMap.map(function (domain) {
                return domain + ':' + domain;
            });
        	function domainProperty(key, caption) {
                return {
                    caption: caption,
                    key: key,
                    type: 'selectmultiple',
                    spec: {options: domains, valueType: 'string'}
                };
            }
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
                    },
                    domainProperty('domains', 'Domains')
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
    </script>
@stop
