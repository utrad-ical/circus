/*--
@title Initialize viewer
@viewerNotRequired

Before jumping in to other examples, you must create a viewer.
This example shows minimum code to initialize CIRCUS RS.
--*/

// Prepare ImageSource object, using the options provided in the boxes above
const imageSource = new config.sourceClass({
	series: config.series,
	server: config.server
});

// Prepare composition.
const comp = new rs.Composition();
comp.setImageSource(imageSource);

// Create a viewer and associate the composition with it.
const div = document.getElementById('viewer');
viewer = new rs.Viewer(div);
viewer.setComposition(comp);



/*--
@title Initialize toolbar
CIRCUS RS comes with a built-in tool bar.
--*/

const container = document.getElementById('toolbar');
container.innerHTML = ''; // Clear existing tool bar

const toolbar = rs.createToolbar(
	container,
	['hand', 'window', 'zoom', 'pager', 'celestialRotate','brush']
);

toolbar.bindViewer(viewer);



/*--
@title Change tool
You can change the active tool.
Associated toolbar (if any) will be automatically updated.
--*/

viewer.setActiveTool('hand');

console.log('The current tool is ' + viewer.getActiveTool());


/*--
@title Add corner text annotation
Corner text annotation shows useful text at the corners of the viewer.
--*/

const comp = viewer.getComposition();
const cornerText = new rs.CornerText();
comp.addAnnotation(cornerText);

// You need to manually re-render the viewer
viewer.render();


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

const viewState = viewer.getState();
viewState.window = {
	width: 250,
	level: 10
};
viewer.setState(viewState);



/*--
@title Add cloud annotation
Adds an cloud annotation to the viewer.
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