$(function(){

	var state = {
		section: {
			origin: [0,0, 186],
			xAxis: [512,0,0],
			yAxis: [0,512,0]
		},
		window: {
			level: 138,
			width: 2277
		}
	};
	
	var imageSource = new circusrs.MockImageSource( {
		width: 512,
		height: 512,
		depth: 419
	} );
	
	var axialElement = document.getElementById('rs-canvas');
	var viewer = new circusrs.Viewer( axialElement );
	viewer.viewState = state;
	viewer.imageSource = imageSource;
	
	
	var p = new SampleRectPainter( 50, 50, 50, 50, 'rgb(0,255,0)' );
	viewer.painters.push( p );
	
	var toolSelector = new circusrs.ToolSelector( viewer );
	
	var handTool = new circusrs.HandTool();
	var handIcon = new circusrs.Icon( document.querySelector('.circus-rs-viewer .icons i.icon.rs-icon-pan') );
	handIcon.on('click', function( ev ){
		toolSelector.select('hand');
	});
	toolSelector.append('hand', handTool, handIcon );
	
	var rotateTool = new circusrs.RotateTool();
	var rotateIcon = new circusrs.Icon( document.querySelector('.circus-rs-viewer .icons i.icon.rs-icon-reference-rotate') );
	rotateIcon.on('click', function( ev ){
		toolSelector.select('rotate');
	});
	toolSelector.append('rotate', rotateTool, rotateIcon );
	
	var voxelCloudTool = new circusrs.VoxelCloudTool();
	var voxelCloudIcon = new circusrs.Icon( document.querySelector('.circus-rs-viewer .icons i.icon.rs-dummy-icon-voxel-cloud') );
	voxelCloudIcon.on('click', function( ev ){
		toolSelector.select('voxel-cloud');
	});
	toolSelector.append('voxel-cloud', voxelCloudTool, voxelCloudIcon );
	
	voxelCloudTool.on('check', function( p ){
		var p = new circusrs.DotObject( p );
		viewStateTool.addObject( p );
		viewer.render();
	});
	

	var viewStateTool = new circusrs.ViewStateTool( axialElement, [50,50] );
	var cso = new circusrs.CrossSectionObject( state.section );
	cso.dimension = imageSource.getDimension();
	viewStateTool.addObject( cso );
	viewStateToolControl( viewer, viewStateTool );
	viewer.painters.push( viewStateTool );
	
	// toolSelector.append('window', windowTool, windowIcon );
	
	initSectionState(viewer);
	
	viewer.render();
	/**
	 * Check render queue engine.
	 */
	// viewer.render().then( function(){ console.log('DONE1') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE2') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE3') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE4') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE5') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE6') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE7') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE8') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE9') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE10') } ).catch( function(e){ console.log(e); } );
	// viewer.render().then( function(){ console.log('DONE11') } ).catch( function(e){ console.log(e); } );
	
	var drawCanvas = document.getElementById('draw-canvas');
	var context = drawCanvas.getContext('2d');
	context.moveTo( 50,50 );
	context.lineTo( 250,250 );
	context.strokeStyle = 'rgba(255,0,0,0.7)';
	context.lineWidth = 1.0;
	context.stroke();

	var slice = context.getImageData( 0, 0, drawCanvas.getAttribute('width') , drawCanvas.getAttribute('height') );
	var voxelCloud = new VoxelCloud();
	voxelCloud.loadSectionSlide( state.section, slice );

	
	
});
function initSectionState( viewer ){
	
	viewer.on('statechange', function(){
		 $('#window-level').val( viewer.viewState.window.level );
		 $('#window-width').val( viewer.viewState.window.width );
	});
	
	$('#window-level').change( function(){
		viewer.viewState.window.level = parseInt( $(this).val() );
		viewer.emit('statechange');
		viewer.render();
	} );
	
	$('#window-width').change( function(){
		viewer.viewState.window.width = parseInt( $(this).val() );
		viewer.render();
	} );
	
	$('#scale').change( function(){
		var zoom = Math.pow( 1.1, $(this).val() );
		var current = ( viewer.viewState.zoom || 1.0 );
		circusrs.CrossSection.scale( viewer.viewState.section, zoom / current );
		viewer.viewState.zoom = zoom;
		viewer.render();
	} );
	
	$('#rotate-x').change( function(){
		var r = parseInt( $(this).val() );
		var current = ( viewer.viewState.xRotated || 0.0 );
		circusrs.CrossSection.rotate( viewer.viewState.section, r - current, [1,0,0] );
		viewer.viewState.xRotated = r;
		viewer.render();
	} );
	$('#rotate-y').change( function(){
		var r = parseInt( $(this).val() );
		var current = ( viewer.viewState.yRotated || 0.0 );
		circusrs.CrossSection.rotate( viewer.viewState.section, r - current, [0,1,0] );
		viewer.viewState.yRotated = r;
		viewer.render();
	} );
	$('#rotate-z').change( function(){
		var r = parseInt( $(this).val() );
		var current = ( viewer.viewState.zRotated || 0.0 );
		circusrs.CrossSection.rotate( viewer.viewState.section, r - current, [0,0,1] );
		viewer.viewState.zRotated = r;
		viewer.render();
	} );
/*
	$('#origin-x').change( function(){
		state.origin[0] = parseInt( $(this).val() );
		state.change();
	} );
	$('#origin-y').change( function(){
		state.origin[1] = parseInt( $(this).val() );
		state.change();
	} );
	$('#origin-z').change( function(){
		state.origin[2] = parseInt( $(this).val() );
		state.change();
	} );
*/
	
}

function viewStateToolControl( viewer, tool, xRot, yRot ){
	var xRot = 46, yRot = 34;
	tool.pan = 2.0;
	tool.setCelestialCamera( xRot, yRot );
	
	var r = { x:0, y:0, z:0 };
	$( 'input#pan-zoom' ).on( 'input', function () {
		tool.pan = $(this).val();
		viewer.render();
	} ).val( tool.pan );
	
	$( 'input#cam-rotate-x' ).on( 'input', function () {
		tool.setCelestialCamera( $('input#cam-rotate-x').val(), $('input#cam-rotate-y').val() );
		$(this).next().text('横 (' + $('input#cam-rotate-x').val() + ')');
		viewer.render();
	} ).val( xRot );

	$( 'input#cam-rotate-y' ).on( 'input', function () {
		tool.setCelestialCamera( $('input#cam-rotate-x').val(), $('input#cam-rotate-y').val() );
		$(this).next().text('縦 (' + $('input#cam-rotate-y').val() + ')');
		viewer.render();
	} ).val( yRot );
}

var SampleRectPainter = (function(){
	var SampleRectPainter = function( left, top, width, height, color ){
		this.left = left;
		this.top = top;
		this.width = width;
		this.height = height;
		this.color = color;
	};
	SampleRectPainter.prototype.draw = function( c, s ){
		var ctx = c.getContext('2d');
		ctx.beginPath();
		ctx.rect( this.left, this.top, this.width, this.height );
		ctx.closePath();
		ctx.fillStyle = this.color;
		ctx.fill();
		
		var self = this;
		return {
			hitTest: function( x, y ){
				return self.left <= x && x <= ( self.left + self.width )
					&& self.top <= y && y <= ( self.top + self.height );
			},
			mouseupHandler: function(ev){
				if( this.hitTest(ev.original.offsetX, ev.original.offsetY) ){
					alert('CLICKED');
					ev.stopPropagation();
				}
			},
			mousedownHandler: function(ev){
				if( this.hitTest(ev.original.offsetX, ev.original.offsetY) ) ev.stopPropagation();
			},
			mousemoveHandler: function(ev){
				if( this.hitTest(ev.original.offsetX, ev.original.offsetY) ) ev.stopPropagation();
			},
			mousewheelHandler: function(ev){
				if( this.hitTest(ev.original.offsetX, ev.original.offsetY) ) ev.stopPropagation();
			}
		};
	};
	
	return SampleRectPainter;
})();
circusrs.MockImageSource.prototype.getDimension = function(){ return [ this.config.width,this.config.height,this.config.depth]; };
