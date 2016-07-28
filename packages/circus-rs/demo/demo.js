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
	const src = new rs.RawVolumeImageSource({ series, server });
	const comp = new rs.Composition();
	comp.setImageSource(src);

	const div = document.getElementById('viewer');
	const viewer = new rs.Viewer(div);
	viewer.setComposition(comp);
	return viewer;
}

function initializeToolbar() {
	return rs.createToolbar(
		document.getElementById('toolbar'),
		['hand', 'window', 'celestialRotate']
	);
}
