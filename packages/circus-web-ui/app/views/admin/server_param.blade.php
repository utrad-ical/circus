@extends('admin.base')
@section('admin-content')
    <script>
        $(function () {
            adminEditor.run({
                resource: 'serverParam',
                primaryKey: 'key',
                captionKey: 'key',
                listColumns: [
                    {key: 'key', label: 'key'},
                    {key: 'value', label: 'value'},
                ],
                form: [
                    {
                        caption: 'Key',
                        key: 'key',
                        type: 'text'
                    },
                    {
                    	caption: 'Value',
                        key: 'value',
                        type: 'text'
                    }
                ]
            });
        });
    </script>
@stop
