'use strict';

// Just for the sake of brevity, we make an alias for circusrs
const rs = circusrs;

// Make this variable available throught the demo
let viewer = null;


//
// The followings do not contain actual usage examples of CIRCUS RS.
// See example.js for demo scripts.
//

let editor = null; // Ace editor
let examples = [];


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
						/^[ \t]*\@([a-zA-Z]+)(?:[ \t]+(.*))?$/gm,
						(m, tag, content) => {
							res[tag] = !content ? true : content;
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
	examples.forEach(item => {
		const opt = $('<option>').text(item.title);
		if (item.color) opt.css('background-color', item.color);
		opt.appendTo(sel);
	});
	sel.trigger('change');
}

function processExampleScript(script) {
	return script.replace(
		/^\s*\/\/\-\-\s*@include\s+(.+)$/gm,
		(m, title) => {
			title = title.trim();
			const item = examples.find(i => title === i.title);
			if (!item) return '';
			return '\n' + processExampleScript(item.script) + '\n';
		}
	);
}

$('#example-select').on('change', () => {
	const title = $('#example-select').val();
	const item = examples.find(i => title === i.title);
	if (!item) return;
	$('#example-desc').html(item.desc);
	editor.setValue(processExampleScript(item.script));
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
