@extends('common.layout')
@include('common.header')
@section('content')
    <style>
        .ui-propertyeditor-row > td {
            padding-bottom: 1em;
        }
    </style>

    <script>
        $(function () {
            var editor = null;
            var resourceUrl = '/api/preference';

            $.get(resourceUrl).then(function (prefs) {
                editor = $('#editor');
                var properties = [
                    {
                        caption: 'Theme',
                        key: 'theme',
                        type: 'radio',
                        spec: {options: ['mode_white:White', 'mode_black:Black']}
                    },
                    {caption: 'Show personal info', key: 'personalInfoView', type: 'checkbox'}
                ];
                editor.propertyeditor({properties: properties}).propertyeditor('option', 'value', prefs);
                $('#save').on('click', saveClicked);
            });

            function saveClicked(data) {
                var data = editor.propertyeditor('option', 'value');
                $.ajax({
                    url: resourceUrl,
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json',
                    data: JSON.stringify(data),
                    success: saveFinished,
                    error: error
                });
            }

            function error(res) {
                if (!res.status) {
                    showMessage('Server did not respond.', true);
                }
                switch (res.status) {
                    case 404:
                        showMessage('not found', true);
                        break;
                    case 401:
                        showMessage('API authorization error. Pleas log-in again.', true);
                        break;
                    default:
                        showMessage('Server returned ' + res.status + 'error.', true);
                }
            }

            function saveFinished() {
                showMessage('Updated your preference.')
            }

            function showMessage() {
                adminEditor.showMessage.apply(this, arguments);
            }
        });
    </script>

    <div class="page_contents_outer">
        <div class="page_contents_inner">
            <div class="page_unique" id="page_admin_home">
                <h1 class="page_ttl">Preferences</h1>

                <div id="messages"></div>
                <div id="editor_container">
                    <div id="editor"></div>
                    <div class="al_c">
                        <button id="save" class="common_btn">Save</button>
                    </div>
                </div>
            </div>
        </div>
        @include('common.navi')
        <div class="clear">&nbsp;</div>
    </div>
@stop
@include('common.footer')