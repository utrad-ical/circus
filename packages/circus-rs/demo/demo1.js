$( function(){
	var rs = circusrs;

	var dummyConfig = {
		width: 512,
		height: 512,
		depth: 128,
//		pixelFormat: PixelFormat.Int16,
		vx: 0.5,
		vy: 0.5,
		vz: 0.5
	};

	var rsViewState = new rs.ViewState(
		[512,512], // canvasSize
		[0,0, dummyConfig.depth / 2], // cOrigin
		[ dummyConfig.width, 0, 0 ],// cX
		[ 0, dummyConfig.height, 0 ], // cY
		1500, // windowLevel
		2000 // windowWidth
	);

	/*

	console.log( 'origin: ' + rsViewState.getOrigin().toString() );
	console.log( 'center: ' + rsViewState.getCenter().toString() );
	console.log( '[ 0,0 ]@canvas => ' + rsViewState.coordinatePixelToVoxel(0,0).toString() );
	console.log( '[ 100,100 ]@canvas => ' + rsViewState.coordinatePixelToVoxel(100,100).toString() );
	console.log( '[ 0,0,64 ]@volume => ' + rsViewState.coordinateVoxelToPixel(0,0,64).toString() );
	console.log( '[ 100,100,64 ]@volume => ' + rsViewState.coordinateVoxelToPixel(100,100,64).toString() );
	console.log( '[ 150,150,70 ]@volume => ' + rsViewState.coordinateVoxelToPixel(150,150,70).toString() );

	var deg = 45;
	console.log( 'rotateZ: ' + deg.toString() + ' [deg]' );
	rsViewState.rotateZ( deg );

	console.log( 'origin: ' + rsViewState.getOrigin().toString() );
	console.log( 'center: ' + rsViewState.getCenter().toString() );
	console.log( '[ 0,0 ]@canvas => ' + rsViewState.coordinatePixelToVoxel(0,0).toString() );
	console.log( '[ 100,100 ]@canvas => ' + rsViewState.coordinatePixelToVoxel(100,100).toString() );
	console.log( '[ 0,0,64 ]@volume => ' + rsViewState.coordinateVoxelToPixel(0,0,64).toString() );
	console.log( '[ 100,100,64 ]@volume => ' + rsViewState.coordinateVoxelToPixel(100,100,64).toString() );
	console.log( '[ 150,150,70 ]@volume => ' + rsViewState.coordinateVoxelToPixel(150,150,70).toString() );
	*/

	var canvas = document.getElementById('rs-canvas');
	var mockViewer = new rs.Viewer( canvas );
	var mockImageSource = new rs.MockImageSource( dummyConfig );
	mockViewer.setImageSource( mockImageSource );
	mockViewer.setViewState( rsViewState );
	
	// arrow
	var textObj = new rs.ArrowText("サンプル");
	var arrowAnnotation=new rs.ArrowAnnotation([100,100,100], [100,100,100], textObj);
	mockViewer.getAnnotationCollection().append( arrowAnnotation );

/*
	var rsAnnotation = new rs.DummyAnnotation();
	var textObj = new rs.ArrowText("サンプル");
	var arrowAnnotation=new rs.ArrowAnnotation([150,150,150], [50,50,50], textObj);
	//pen annotation
	//dummy data

	var dummyPenData=[
		[100,100,100],
		[101,100,100],
		[102,100,100],
		[103,100,100],
		[104,100,100],
		[105,100,100],
		[106,100,100],
		[107,100,100],
		[108,100,100],
		[109,100,100],
		[100,101,100],
		[101,101,100],
		[102,101,100],
		[103,101,100],
		[104,101,100],
		[105,101,100],
		[106,101,100],
		[107,101,100],
		[108,101,100],
		[109,101,100],
	];

	var penAnnotation=new rs.VoxelAnnotation(dummyPenData, [255,0,0]);
	mockViewer.getAnnotationCollection().append( arrowAnnotation );
	mockViewer.getAnnotationCollection().append( penAnnotation );
*/

	mockViewer.render();





	var viewStateCanvas = document.getElementById('view-state-canvas');
	var rsViewer = new rs.Viewer( viewStateCanvas );
	var rsImageSource = new rs.ViewStateImageSource(
		dummyConfig.width,
		dummyConfig.height,
		dummyConfig.depth );
	rsViewer.setImageSource( rsImageSource );
	rsViewer.setViewState( rsViewState );

	var rsAnnotationCollection = rsViewer.getAnnotationCollection();

	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		5, 0, 0, // xAxis
		350, 30, 30, 'rgba(255,255,0,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		0, 5, 0, // yAxis
		400, 30, 30, 'rgba(255,0,255,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		0, 0, 5, // zAxis
		450, 30, 30, 'rgba(0,255,255,0.3)'
	) );

	rsAnnotationCollection.append( new rs.ControlRotateAnnotation(
		1, 0, 0, // xAxis
		350, 70, 30, 'rgba(255,0,0,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlRotateAnnotation(
		0, 1, 0, // yAxis
		400, 70, 30, 'rgba(0,255,0,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlRotateAnnotation(
		0, 0, 1, // zAxis
		450, 70, 30, 'rgba(0,0,255,0.3)'
	) );

	rsAnnotationCollection.append( new rs.ControlScaleAnnotation(
		1.1, // scale
		450, 110, 30, 'rgba(128,128,128,0.3)'
	) );
	rsViewer.render();
	rsViewer.on('render',function( e ){
		mockViewer.render();
	});

	// Temporary draw sample ( Erased in the next rendering )
	/*
	rsViewer.draw( function(canvasDomElement, viewState){
		var context = canvasDomElement.getContext('2d');
		context.font = "20pt Arial";
		context.fillStyle = 'rgb(255, 255, 255)';
		context.fillText("[First only]" , 50,430);
		return new rs.DummySprite( null );
	} );
	*/
});
