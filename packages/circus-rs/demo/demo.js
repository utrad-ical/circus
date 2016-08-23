const rs = circusrs;

const config = JSON.parse(localStorage.getItem('rs-demo-save'));
if (config) {
	$('#series').val(config.series);
	$('#server').val(config.server);
}

$('#load').on('click', () => {
	const config = {
		series: $('#series').val(),
		server: $('#server').val()
	};
	localStorage.setItem('rs-demo-save', JSON.stringify(config));
	const viewer = initializeViewer(config.series, config.server);
	const toolbar = initializeToolbar();
	toolbar.bindViewer(viewer);
});

function initializeViewer(series, server) {
	const sourceClass = rs[$('#type').val()]; // ImageSource class

	const src = new sourceClass({ series, server });
	const comp = new rs.Composition();
	comp.setImageSource(src);
	const cornerText = new rs.CornerText();
	comp.addAnnotation(cornerText);

	const div = document.getElementById('viewer');
	const viewer = new rs.Viewer(div);
	viewer.setComposition(comp);

	return viewer;
}

function initializeToolbar() {
	const container = document.getElementById('toolbar');
	container.innerHTML = '';
	return rs.createToolbar(
		container,
		['hand', 'window', 'zoom', 'pager', 'celestialRotate']
	);
}
