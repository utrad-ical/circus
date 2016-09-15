/*--
@title Initialize viewer

This example shows the minimum code to initialize CIRCUS RS.
--*/

// Prepare ImageSource object.
const imageSource = new config.sourceClass({
	series: config.series,
	server: config.server
});
const comp = new rs.Composition();
comp.setImageSource(imageSource);

const div = document.getElementById('viewer');
viewer = new rs.Viewer(div);
viewer.setComposition(comp);

/*--
@title Initialize toolbar
CIRCUS RS comes with a built-in tool bar.
--*/

const container = document.getElementById('toolbar');
container.innerHTML = '';

const toolbar = rs.createToolbar(
	container,
	['hand', 'window', 'zoom', 'pager', 'celestialRotate','brush']
);

toolbar.bindViewer(viewer);

/*--
@title Add corner text annotation
--*/

const comp = viewer.getComposition();
const cornerText = new rs.CornerText();
comp.addAnnotation(cornerText);

/*--
@title Apply orthogonal MPR
Resets the view state to one of the orthogonal MPR slice.
--*/

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

mpr('sagittal'); // or 'axial', 'coronal'

/*--
@title Set display window
Resets the view state to one of the orthogonal MPR slice.
--*/

const vs = viewer.getState();
vs.window = {
	width: 250,
	level: 10
};
viewer.setState(vs);

/*--
@title Add cloud annotation
This example add an cloud annotation.
--*/

function addCloudAnnotation({
	origin = [10, 10, 10],
	size = [64, 64, 64],
	color = '#ff0000',
	alpha = 0.5,
	debugPoint = false
} = {}) {
	const cloud = new rs.VoxelCloud();
	const volume = new rs.RawData();
	const comp = viewer.getComposition();
	volume.setDimension(size[0], size[1], size[2], rs.PixelFormat.Binary);
	volume.fillAll(1);
	const src = comp.imageSource;
	volume.setVoxelDimension(...src.meta.voxelSize);
	cloud.volume = volume;
	cloud.origin = origin;
	cloud.color = color;
	cloud.alpha = alpha;
	cloud.debugPoint = debugPoint;
	comp.addAnnotation(cloud);
}

addCloudAnnotation();