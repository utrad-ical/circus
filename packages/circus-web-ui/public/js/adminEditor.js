var adminEditor = (function ($) {
  var opt = null;
  var status = 'uninitialized';
  var editor = null;
  var target = null;
  var resourceUrl = null;

  function error(res) {
    if (!res.status) {
      showMessage('Server did not respond.', true);
    }
    switch (res.status) {
      case 400:
        if ($.isPlainObject(res.responseJSON)) {
          editor.propertyeditor('complain', res.responseJSON.errors);
        } else {
          showMessage(res.responseText, true);
        }
        break;
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

  function run(options) {
    opt = options;
    resourceUrl = '/api/' + opt.resource;

    $('#list').on('click', 'button.edit', editButtonClicked);
    $('#cancel').on('click', function () {
      $('#editor_container').hide();
    });
    $('#save').on('click', saveClicked);
    $('#new').on('click', newClicked);

    editor = $('#editor');
    editor.propertyeditor({properties: opt.form});
    drawListHeader();
    refreshList();
  }

  function drawListHeader() {
    var row = $('#list thead').empty();
    opt.listColumns.forEach(function (column) {
      $('<th>').text(column.label).appendTo(row);
    });
    $('<th>').appendTo(row); // editor cell
  }

  function refreshList() {
    $('#editor_container').hide();
    status = 'loading';
    $.ajax({
      url: resourceUrl,
      success: drawList,
      error: error,
      dataType: 'json',
      cached: false
    });
  }

  function drawList(list) {
    var container = $('#list tbody').empty();
    list.forEach(function (item) {
      var row = $('<tr>').data('id', item[opt.primaryKey]);
      opt.listColumns.forEach(function (column) {
        var text = '';
        if (typeof column.data === 'function') {
          text = column.data(item);
        } else {
          text = item[column.key];
        }
        $('<td>').appendTo(row).append(text);
      });
      $('<td class="operation_cell"><button class="edit common_btn">Edit</button></td>').appendTo(row);
      container.append(row);
      if (typeof opt.postDrawListRow == 'function') opt.postDrawListRow(row, item);
    });
    if (typeof opt.postDrawList == 'function') opt.postDrawList(list);
    status = 'normal';
  }

  function editButtonClicked(event) {
    // if (status !== 'normal') return;
    $('#list tr').removeClass('highlight');
    var row = $(event.target).closest('tr').addClass('highlight');
    var id = row.data('id');
    target = id;
    status = 'loading';
    $.ajax({
      url: resourceUrl + '/' + id,
      success: function (data) {
        beginEdit(data);
      },
      error: error,
      dataType: 'json',
      cached: false
    });
  }

  function newClicked(event) {
    target = null;
    beginEdit({});
  }

  function beginEdit(data) {
    status = 'editing';
    var title = target ? 'Update ' + data[opt.captionKey] : 'Create new ' + opt.resource;
    $('#status').text(title);
    editor.propertyeditor('clear');
    editor.propertyeditor('option', 'value', data || {});
    if (typeof opt.beforeEdit === 'function') opt.beforeEdit(target);
    $('#editor_container').show();
    $('#messages').empty();
  }

  function saveClicked(data) {
    var method = 'POST';
    var url = resourceUrl;
    if (target !== null) {
      method = 'PUT';
      url += '/' + target;
    }

    var data = editor.propertyeditor('option', 'value');
    $.ajax({
      url: url,
      type: method,
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: saveFinished,
      error: error
    });
  }

  function saveFinished(data) {
    if (data.status == 'OK') {
      showMessage('Data saved.');
      $('#editor_container').hide();
      refreshList();
    }
  }

  function showMessage(message, isError) {
    var className = isError ? 'ui-state-error' : 'ui-state-highlight';
    var div = $('<div>').addClass(className + ' mar_20').text(message).appendTo('#messages');
    setTimeout(function () {
      div.remove();
    }, 5000);
  }

  return {run: run, showMessage: showMessage, refreshList: refreshList};
})(jQuery);
