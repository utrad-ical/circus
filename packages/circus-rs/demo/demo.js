'use strict';

const rs = circusrs;

let viewer = null;
let editor = null; // Ace editor
let examples = [];

//
// The followings does not contain the actual usage of CIRCUS RS.
// See example.js
//

restoreConfig();
invokeAce();
loadExampleScript();

function restoreConfig() {
	const cfg = JSON.parse(localStorage.getItem('rs-demo-save'));
	if (cfg) {
		$('#series').val(cfg.series);
		$('#server').val(cfg.server);
	}
}

function invokeAce() {
	editor = ace.edit('example-script');
	editor.getSession().setMode("ace/mode/javascript");
	editor.setShowPrintMargin(false);
	editor.setHighlightActiveLine(false);
	editor.renderer.setShowGutter(false);
	editor.$blockScrolling = Infinity;
}

function loadExampleScript() {
	$.get({ url: 'examples.js', dataType: 'text' }).then(data => {
		// parse
		const items = data.split(/\s(?=\/\*\-\-)/);
		examples = items.map(item => {
			const res = {};
			item = item.replace(
				/\/\*\-\-((.|\s)+?)\-\-\*\//g,
				(m, line) => {
					line = line.replace(
						/^\s*\@([a-zA-Z]+)\s+(.*)$/gm,
						(m, tag, content) => {
							res[tag] = content === '' ? true : content;
							return '';
						}
					);
					res.desc = line.trim();
					return '';
				}
			);
			res.script = item.trim();
			return res;
		});
		buildExampleList();
	}).fail(err => alert('Failed to load example JS file'));
}

function buildExampleList() {
	const sel = $('#example-select').empty();
	examples.forEach((item, i) => {
		$('<option>').data('index', i).text(item.title).appendTo(sel);
	});
	sel.trigger('change');
}

$('#example-select').on('change', () => {
	const title = $('#example-select').val();
	const item = examples.find(i => title === i.title);
	if (!item) return;
	$('#example-desc').html(item.desc);
	editor.setValue(item.script);
	editor.clearSelection();
});

$('#example-run').on('click', () => {
	const config = {
		series: $('#series').val(),
		server: $('#server').val(),
	};
	localStorage.setItem('rs-demo-save', JSON.stringify(config));

	const title = $('#example-select').val();
	const item = examples.find(i => title === i.title);
	if (!item.viewerNotRequired && viewer === null) {
		alert('Please create a viewer first.');
		return;
	}

	config.sourceClass = rs[$('#type').val()] // ImageSource class
	window.config = config;

	const script = editor.getValue();

	// eval the script
	(new Function(script))();
});
