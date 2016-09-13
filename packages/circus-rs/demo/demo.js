'use strict';

var rs = circusrs;

const config = JSON.parse(localStorage.getItem('rs-demo-save'));
if (config) {
	$('#series').val(config.series);
	$('#server').val(config.server);
}

var viewer = null;

$('#load').on('click', () => {
	const config = {
		series: $('#series').val(),
		server: $('#server').val()
	};
	localStorage.setItem('rs-demo-save', JSON.stringify(config));
	viewer = initializeViewer(config.series, config.server);
	const toolbar = initializeToolbar();
	toolbar.bindViewer(viewer);

	putAnnotation(viewer.composition);
});

function initializeViewer(series, server) {
	const sourceClass = rs[$('#type').val()]; // ImageSource class

	const src = new sourceClass({ series, server });
	const comp = new rs.Composition();
	comp.setImageSource(src);

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
		['hand', 'window', 'zoom', 'pager', 'celestialRotate','brush']
	);
}

function addCloudAnnotation({
	origin = [10, 10, 10],
	size = [64, 64, 64],
	color = '#ff0000',
	alpha = 0.5
} = {}) {
	const cloud = new rs.VoxelCloud();
	const volume = new rs.RawData();
	const comp = viewer.getComposition();
	volume.setDimension(size[0], size[1], size[2], rs.PixelFormat.Binary); // 4 = Binary
	for (let x = 0; x < size[0]; x++) {
		for (let y = 0; y < size[1]; y++) {
			for (let z = 0; z < size[2]; z++) {
				volume.writePixelAt(1, x, y, z);
			}
		}
	}
	const src = comp.imageSource;
	volume.setVoxelDimension(...src.meta.voxelSize);
	cloud.volume = volume;
	cloud.origin = origin;
	cloud.color = color;
	cloud.alpha = alpha;
	comp.addAnnotation(cloud);
}

function mpr(orientation, position) {
	const state = viewer.getState();
	const mmDim = viewer.getComposition().imageSource.mmDim();
	state.section = rs.createOrthogonalMprSection(
		viewer.getResolution(),
		mmDim,
		orientation,
		position
	);
	viewer.setState(state);
}

function putAnnotation( comp ) {
	const cornerText = new rs.CornerText();
	comp.addAnnotation(cornerText);
}
