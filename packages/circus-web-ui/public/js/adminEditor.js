var adminEditor = (function ($) {
	var opt = null;
	var status = 'uninitialized';
	var editor = null;
	var target = null;

	function run(options) {
		opt = options;

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
		api(opt.resource, {success: drawList});
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
		api(opt.resource + '/' + id, {
			success: function (data) {
				beginEdit(data);
			}
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
		if (!editor.propertyeditor('valid')) {
			showMessage('Fill all the fields correctly before saving.', true);
			return;
		}

		var method = 'POST';
		var command = opt.resource;
		if (target !== null) {
			method = 'PUT';
			command += '/' + target;
		}

		var data = editor.propertyeditor('option', 'value');
		api(command, {
			method: method,
			data: data,
			success: saveFinished,
			error400: function (res) {
				if ($.isPlainObject(res.responseJSON)) {
					editor.propertyeditor('complain', res.responseJSON.errors);
				} else {
					showMessage(res.responseText, true);
				}
			}
		});
	}

	function saveFinished(data) {
		if (data.status == 'OK') {
			showMessage('Data saved.');
			$('#editor_container').hide();
			refreshList();
		}
	}

	return {run: run, refreshList: refreshList};
})(jQuery);
