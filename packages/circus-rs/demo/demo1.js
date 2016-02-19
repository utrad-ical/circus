var demoConfig = {
	series: '1.2.840.113704.1.111.732.1330387449.6',
	server: 'http://' + window.location.hostname.toString()+':51300'
};

$( function(){
	
	/**
	 * You can use other image source while loading, if know the size.
	 */
	// Prepare image source
	var dummyImageSource = new circusrs.MockImageSource({
		width: 512,
		height: 512,
		depth: 419
	});
	// Prepare viewer
	var dim = dummyImageSource.getDimension();
	var canvas = document.getElementById('rs-canvas');
	var viewer = new circusrs.Viewer( canvas );
	viewer.setImageSource( dummyImageSource );
	
	// Prepare view state
	var viewState = new circusrs.ViewState(
		[ canvas.getAttribute('width'), canvas.getAttribute('height')], // canvasSize,
		[0,0, 186], // cOrigin
		[ dim[0], 0, 0 ],// cX
		[ 0, dim[1], 0 ], // cY
		138, // windowLevel
		2277 // windowWidth
	);
	viewer.setViewState( viewState );
	viewer.render();

	/**
	 * Prepare viewer to check viewport for debug
	 */
	var stateImageSource = new circusrs.ViewStateImageSource( dim[0], dim[1], dim[2] );
	var viewStateCanvas = document.getElementById('view-state-canvas');
	var viewStateCanvasSize = [ viewStateCanvas.getAttribute('width'), viewStateCanvas.getAttribute('height')]
	var stateViewer = new circusrs.Viewer( viewStateCanvas );
	stateViewer.setImageSource( stateImageSource );
	// Attention: the same view state
	stateViewer.setViewState( viewState );
	
	// Append some annotations to stateViewer
	var rsAnnotationCollection = stateViewer.getAnnotationCollection();
	rsAnnotationCollection.append( new circusrs.ControlTransAnnotation(
		1, 0, 0, // xAxis
		viewStateCanvasSize[0]-40, 10, 30, 'rgba(0,255,96,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlTransAnnotation(
		0, 1, 0, // yAxis
		viewStateCanvasSize[0]-40, 50, 30, 'rgba(9,101,255,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlTransAnnotation(
		0, 0, 1, // zAxis
		viewStateCanvasSize[0]-40, 90, 30, 'rgba(248,139,76,0.7)'
	) );

	rsAnnotationCollection.append( new circusrs.ControlRotateAnnotation(
		1, 0, 0, // xAxis
		10, viewStateCanvasSize[1]-40, 30, 'rgba(0,255,96,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlRotateAnnotation(
		0, 1, 0, // yAxis
		50, viewStateCanvasSize[1]-40, 30, 'rgba(9,101,255,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlRotateAnnotation(
		0, 0, 1, // zAxis
		90, viewStateCanvasSize[1]-40, 30, 'rgba(248,139,76,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlScaleAnnotation(
		1.1, // scale
		viewStateCanvasSize[0]-40, viewStateCanvasSize[1]-40, 30, 'rgba(128,128,128,0.3)'
	) );
	stateViewer.render();

	// Sync rendering.
	stateViewer.on('render',function( e ){
		viewer.render();
	});

	/**
	 * Prepare the image source you want to see realy
	 */
	var loader = new circusrs.RawDataLoader( {
		server: demoConfig.server
	} );
	var imageSource = demoConfig.dummy ? dummyImageSource : new circusrs.RawVolumeImageSource( loader );
	imageSource.setSeries( demoConfig.series );
	imageSource.load();
	imageSource.once('loaded', function(vol){
		viewer.setImageSource( imageSource );
		viewer.render();
	});
});

circusrs.MockImageSource.prototype.load = function(){};
circusrs.MockImageSource.prototype.setSeries = function(){};
circusrs.MockImageSource.prototype.getDimension = function(){ return [ this.config.width,this.config.height,this.config.depth]; };
circusrs.MockImageSource.prototype.once = function(s,f){ f(this); };
