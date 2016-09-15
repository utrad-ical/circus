'use strict';

const rs = circusrs;

let viewer = null;
let examples = [];

//
// The followings does not contain the actual usage of CIRCUS RS.
// See example.js
//

function restoreConfig() {
	const cfg = JSON.parse(localStorage.getItem('rs-demo-save'));
	if (cfg) {
		$('#series').val(cfg.series);
		$('#server').val(cfg.server);
	}
}

restoreConfig();
loadExampleScript();

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
						/^\s*\@([a-z]+)\s+(.+)$/gm,
						(m, tag, content) => {
							res[tag] = content;
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
	$('#example-title').text(item.title);
	$('#example-desc').text(item.desc);
	$('#example-script').val(item.script);
});

$('#example-run').on('click', () => {
	const config = {
		series: $('#series').val(),
		server: $('#server').val(),
	};
	localStorage.setItem('rs-demo-save', JSON.stringify(config));

	config.sourceClass = rs[$('#type').val()] // ImageSource class
	window.config = config;

	const script = $('#example-script').val();

	// eval the script
	(new Function(script))();
});
