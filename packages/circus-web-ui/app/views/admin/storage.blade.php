@extends('admin.base')
@section('admin-content')
    <style>
        .ui-typedfield-text {
            width: 300px;
        }
    </style>
    <div>Warning: Changing path may cause unexpected results.</div>
    <script>
        $(function () {
            adminEditor.run({
                resource: 'storage',
                primaryKey: 'storageID',
                captionKey: 'storageID',
                listColumns: [
                    {key: 'storageID', label: 'Storage ID'},
                    {key: 'type', label: 'Type'},
                    {key: 'path', label: 'Path'},
                    {label: 'Active', data: function(item) { return item.active ? 'Yes' : '-' } }
                ],
                form: [
                    {
                        caption: 'Storage Type', key: 'type', type: 'select',
                        spec: {options: ['dicom:DICOM Storage', 'label:Label Data']}
                    },
                    {caption: 'Change Path', key: 'path', type: 'text'}
                ],
                postDrawListRow: function(row, item) {
                    console.log(item);
                    if (!item.active) {
                        var button = $('<button class="common_btn setactive">').text('Set as active');
                        $(row).find('td:last').append(' ', button);
                    }
                }
            });

            $('#list').on('click', 'button.setactive', function(event) {
                var id = $(event.target).closest('tr').data('id');
                $.ajax({
                    url: '/api/storage/setactive/' + id,
                    type: 'PUT',
                    success: function() {
                        adminEditor.showMessage('Storage ' + id + ' was set to active.');
                        adminEditor.refreshList();
                    }
                });
            });
        });
    </script>
@stop
