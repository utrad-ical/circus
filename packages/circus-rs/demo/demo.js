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
	initializeViewer(config.series, config.server);
});

function initializeViewer(series, server) {
	const src = new rs.RawVolumeImageSource({ series, server });
	const comp = new rs.Composition();
	comp.setImageSource(src);

	const div = document.getElementById('viewer');
	const viewer = new rs.Viewer(div);
	viewer.setComposition(comp);
}
