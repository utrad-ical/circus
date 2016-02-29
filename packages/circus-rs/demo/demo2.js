$( function(){
	var rs = circusrs;
	var dummyConfig = {
		width: 512,
		height: 512,
		depth: 128,
		// pixelFormat: PixelFormat.Int16,
		vx: 0.5,
		vy: 0.5,
		vz: 0.5
	};
	var rsDummyImageSource = new rs.MockImageSource(dummyConfig);

	//create 3-dimentional viewState
	var rsViewState = new rs.VolumeViewState(
		[512,512], // canvasSize
		[0,0, dummyConfig.depth / 2], // cOrigin
		[ dummyConfig.width, 0, 0 ],// cX
		[ 0, dummyConfig.height, 0 ], // cY
		1500, // windowLevel
		2000 // windowWidth
	);
	var rsViewState2 = new rs.VolumeViewState(
		[512,512], // canvasSize
		[dummyConfig.width / 2, dummyConfig.height, -192], // cOrigin
		[ 0, -1 * dummyConfig.width, 0 ],// cX
		[ 0, 0, dummyConfig.height ], // cY
		1500, // windowLevel
		2000 // windowWidth
	);
	var rsViewState3 = new rs.VolumeViewState(
		[512,512], // canvasSize
		[0, dummyConfig.height / 2, -192], // cOrigin
		[ dummyConfig.width, 0, 0 ],// cX
		[ 0, 0, dummyConfig.height ], // cY
		1500, // windowLevel
		2000 // windowWidth
	);

	//setup composition
	var composition = new rs.Composition();
	composition.setImageSource( rsDummyImageSource );

	//create 3-dimentional view
	var canvas2 = document.getElementById('rs-canvas');
	var rsViewer2 = new rs.Viewer( canvas2, composition );
	rsViewer2.setVolumeViewState( rsViewState );

	var canvas3 = document.getElementById('rs-canvas2');
	var rsViewer3 = new rs.Viewer( canvas3, composition );
	rsViewer3.setVolumeViewState( rsViewState2 );

	var canvas4 = document.getElementById('rs-canvas3');
	var rsViewer4 = new rs.Viewer( canvas4, composition );
	rsViewer4.setVolumeViewState( rsViewState3 );

	// var textObj = new rs.ArrowText("サンプル");
	// var arrowAnnotation=new rs.ArrowAnnotation([150,150,100], [50,50,50], textObj);

	//sample cloud volume
	var volume = [];
	for( var x = 0; x<99; x++){
	for( var y = 0; y<99; y++){
	for( var z = 0; z<99; z++){
		if (Math.sqrt(x*x + y*y + z*z) > 50) {
			volume[volume.length] = [x+80,y+50,z + 40];
		}
	}}}
	var cloudAnnotationSample = new rs.VoxelCloudAnnotation(volume, [0, 255, 0, 0.3], [512, 512, 128]);

	var dotText = new rs.PointText("サンプル");
	var dotAnnotation = new rs.PointAnnotation(
		0,
		[150, 100, 30],
		10,
		[255, 0, 0, 1],
		dotText);
	var circleAnnotation = new rs.PointAnnotation(
		1,
		[200, 130, 30],
		10,
		[0, 255, 0, 1],
		dotText);
	//set event before append
	composition.getAnnotationCollection().on("append", function(annoCol){
		var liElm = document.createElement("li");
		var frag = document.createDocumentFragment();
		for (var i = 0; i < annoCol.length; i++) {
			var c = annoCol[i];
			if (c instanceof rs.Annotation) {//some kind of annotation
				var clone = liElm.cloneNode(false);
				var label = "x_annotation";
				if(c instanceof rs.PointAnnotation) {
					label = "point annotation";
					//add extra attribute
					clone.setAttribute("data-coordinate-x", c.getCenter()[0]);
					clone.setAttribute("data-coordinate-y", c.getCenter()[1]);
					clone.setAttribute("data-coordinate-z", c.getCenter()[2]);
				}
				if (c instanceof rs.VoxelCloudAnnotation) {
					label = "cloud_volume";
				}
				clone.setAttribute("data-vox-anno-id", c.getId());
				clone.appendChild(document.createTextNode(label));
				frag.appendChild(clone);
			}
		}

		var pointListElm = document.getElementById("point_list");
		$(pointListElm).empty();
		pointListElm.appendChild(frag);
	});

	//Add tool section==========================================================
	var handOption2 = {x:20, y:20, image:"tool-icon-sprite.png", width:32, height:30, positionX:0, positionY:30, cursor:"move"};
	var scaleOption2 = {x:20, y:70, image:"tool-icon-sprite.png", width:32, height:30, positionX:0, positionY:60, cursor:"default"};
	var rotateOption2 = {x:20, y:120, image:"tool-icon-sprite.png", width:32, height:30, positionX:0, positionY:300, cursor:"default"};
	var penOption = {x:20, y:170, image:"tool-icon-sprite.png", width:32, height:30, positionX:0, positionY:0, cursor:"default"};
	var dotOption = {x:20, y:220, image:"tool-icon-sprite.png", width:32, height:30, positionX:0, positionY:390, cursor:"crosshair"};
	var circleOption = {x:20, y:270, image:"tool-icon-sprite.png", width:32, height:30, positionX:0, positionY:360, cursor:"crosshair"};
	var bucketOption = {x:20, y:320, image:"tool-icon-sprite.png", width:32, height:30, positionX:0, positionY:270, cursor:"default"};

	//set tools
	var hand = new rs.HandTool(handOption2);
	var scale = new rs.ScaleTool(scaleOption2, 1.1);
	var rotateZ = new rs.RotateTool(rotateOption2);
	var pen = new rs.PenTool(penOption);
	var dotTool = new rs.PointTool(dotOption, 0);
	var circleTool = new rs.PointTool(circleOption, 1);
	var bucketTool = new rs.BucketTool(bucketOption);
	var tools = [hand, scale, rotateZ, pen, dotTool, circleTool, bucketTool];
	for (var i = 0; i < tools.length; i++) {
		toolSetter(rsViewer2, tools[i]);
		toolSetter(rsViewer3, tools[i]);
		toolSetter(rsViewer4, tools[i]);
	}

	//init with hand tool
	rsViewer2.setBackgroundEventCapture(hand);
	rsViewer3.setBackgroundEventCapture(hand);
	rsViewer4.setBackgroundEventCapture(hand);

	//add initial annotation section
	composition.getAnnotationCollection().append(cloudAnnotationSample);
	composition.getAnnotationCollection().append(dotAnnotation);
	composition.getAnnotationCollection().append(circleAnnotation);

	//render
	rsViewer2.render();
	rsViewer3.render();
	rsViewer4.render();

	//annotation selection event-------------------
	//move center to the selected point
	$("#point_list").on("click", function(e){
		var vs = rsViewer2.getViewState();
		var currentViewCenter = vs.getCenter();
		if (e.target.hasAttribute("data-coordinate-x")
			&& e.target.hasAttribute("data-coordinate-y")
			&& e.target.hasAttribute("data-coordinate-z")) {
			var targetPoint = [
				e.target.getAttribute("data-coordinate-x"),
				e.target.getAttribute("data-coordinate-y"),
				e.target.getAttribute("data-coordinate-z"),
			];
			var translateDistance = [
				targetPoint[0] - currentViewCenter[0],
				targetPoint[1] - currentViewCenter[1],
				targetPoint[2] - currentViewCenter[2]
			];
			vs.transrate(translateDistance[0], translateDistance[1], translateDistance[2]);
			rsViewer2.render();
		}
		if (e.target.hasAttribute("data-vox-anno-id")) {
			var targetId = e.target.getAttribute("data-vox-anno-id");
			composition.getAnnotationCollection().setCurrentAnnotationId(targetId);
		}
	});
	//add annotation button event
	$("#add_voxel_annotation_btn").on("click", function(){
		var r=document.getElementById("r_color").value;
		var g=document.getElementById("g_color").value;
		var b=document.getElementById("b_color").value;
		var newVoxelAnnotation = new rs.VoxelCloudAnnotation([], [r, g, b, 1.0], [512, 512, 128]);
		var newId = composition.getAnnotationCollection().append(newVoxelAnnotation);
		composition.getAnnotationCollection().setCurrentAnnotationId(newId);
	});

	//==================================================
	//view for debug
	var viewStateCanvas = document.getElementById('view-state-canvas');
	var viewStateCanvas2 = document.getElementById('view-state-canvas2');
	var viewStateCanvas3 = document.getElementById('view-state-canvas3');
	var rsViewer = new rs.Viewer( viewStateCanvas );
	var rsViewerB = new rs.Viewer( viewStateCanvas2 );
	var rsViewerC = new rs.Viewer( viewStateCanvas3 );

	var rsImageSource = new rs.VolumeViewStateImageSource(
		dummyConfig.width,
		dummyConfig.height,
		dummyConfig.depth );
	rsViewer.setImageSource( rsImageSource );
	rsViewer.setVolumeViewState( rsViewState );
	rsViewerB.setImageSource( rsImageSource );
	rsViewerB.setVolumeViewState( rsViewState2 );
	rsViewerC.setImageSource( rsImageSource );
	rsViewerC.setVolumeViewState( rsViewState3 );
	rsViewerB.render();
	rsViewerC.render();

	var rsAnnotationCollection = rsViewer.getAnnotationCollection();

	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		2, 0, 0, // xAxis
		350, 30, 30, 'rgba(255,255,0,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		0, 2, 0, // yAxis
		400, 30, 30, 'rgba(255,0,255,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		0, 0, 2, // zAxis
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
	// rsViewer.on('render',function( e ){
	// 	rsViewer2.render();
	// });
	//----------
	rsViewer2.on("render", function(){
		rsViewer.render();
		// var diff = rsViewer2.getViewState().getOriginMove();
		// var vs3 = rsViewer3.getViewState();
		// var vs4 = rsViewer4.getViewState();
		// vs3.moveOrigin([diff[0], diff[1], 0]);//only move...
		// vs4.moveOrigin([diff[0], diff[1], 0]);//only move...
		// rsViewer3.render();
		// rsViewer4.render();

	});
	rsViewer3.on("render", function(){
		rsViewerB.render();
	});
	rsViewer4.on("render", function(){
		rsViewerC.render();
	});
});

function toolSetter(viewer, tool){
	viewer.appendToolSprite(tool.createSprite());
	viewer.on("render", function(){
		this.drawBy(tool);
	});
	tool.on("ready", function(){
		viewer.drawBy(this);
	});
}