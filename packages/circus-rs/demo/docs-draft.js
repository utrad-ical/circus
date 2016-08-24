const rs = circusrs;

const config = JSON.parse(localStorage.getItem('rs-demo-save'));

if (config) {

var series = config.series;
var server = config.server;

const src = new circusrs.DynamicImageSource({ series, server });
const viewer = new circusrs.Viewer( document.getElementById('viewer') );

const comp = new circusrs.Composition();
comp.setImageSource(src);
viewer.setComposition(comp);

class MyCustomTool {
	mouseUpHandler(viewerEvent) {
		alert('Hello CIRCUS RS Tool!');
	};
	mouseDownHandler(viewerEvent) {};
	mouseMoveHandler(viewerEvent) {};
	dragStartHandler(viewerEvent) {};
	dragHandler(viewerEvent) {};
	dragEndHandler(viewerEvent) {};
	wheelHandler(viewerEvent) {
		const viewer = viewerEvent.viewer;
		const state = viewer.getState();
		const step = -Math.sign( viewerEvent.original.deltaY );
		const src = viewer.composition.imageSource;
		const voxelSize = src.voxelSize();
		state.section = circusrs.orientationAwareTranslation(state.section, voxelSize, step);
		viewer.setState(state);
	};
}
circusrs.registerTool('mytool', MyCustomTool);
// viewer.setActiveTool( 'mytool' );
// circusrs.registerTool('rs-hand-tool', circusrs.HandTool);
// circusrs.registerTool('rs-zoom-tool', circusrs.ZoomTool);
// circusrs.registerTool('rs-window-tool', circusrs.WindowTool);

// const toolList = [ 'mytool', 'rs-hand-tool', 'rs-zoom-tool', 'rs-window-tool' ];
// const toolSelector = document.createElement('select');
// toolList.forEach( (toolName) => {
	// const option = document.createElement('option');
	// option.appendChild(
		// document.createTextNode( toolName )
	// );
	// toolSelector.appendChild(option);
// } );
// toolSelector.addEventListener('change', function(){
	// viewer.setActiveTool( toolList[this.selectedIndex] );
// } );
// document.getElementById('tool-selector').appendChild( toolSelector );
// viewer.setActiveTool( toolList[0] );

// circusrs.registerTool('hand', circusrs.HandTool);
// circusrs.registerTool('zoom', circusrs.ZoomTool);
// circusrs.registerTool('window', circusrs.WindowTool);

const toolbar = circusrs.createToolbar(
	document.getElementById('tool-selector'),
	['mytool', 'hand', 'zoom', 'window']
);
toolbar.bindViewer(viewer);




// TODO: viewer.on('sourceInitialize', () => {
src.ready().then( () => {
	
	const state = viewer.getState();
	console.log( JSON.stringify(state,null,'  ') );
	
	const [ width, height, depth ] = src.mmDim();
	
	// state.section.origin = [0, height / 2, 0];
	// state.section.xAxis = [width, 0, 0];
	// state.section.yAxis = [0, 0, depth];
				
	// viewer.setState( state );
} );

}

