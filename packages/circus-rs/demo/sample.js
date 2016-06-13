$(function(){
	
	$('#use-button').on('click', function(){
		localStorage.setItem( 'rs-demo-save', JSON.stringify( {
			server: $('#server').val(),
			series: $('#series').val()
		} ) );
		window.location.reload();
	});
	
	var config = (function(){
		var config = JSON.parse( localStorage.getItem('rs-demo-save') );
		if ( config ) {
			$('#series').val( config.series );
			$('#server').val( config.server );
			return config;
		}else{
			return null;
		}
	})();
	
	if( config ) rs( config );
} );

function rs( config ){
	var composition = new circusrs.Composition();

	var toolbar = circusrs.createToolbar(
		document.querySelector('div#rs-toolbar'),
		[ 'Window', 'Hand', 'CelestialRotate'
		 ,'Brush', 'Eraser', 'Bucket'
		 ,'Ruler', 'Arrow', 'Cube'
		 ,'ReferenceRotate', 'ReferenceMove'
		 ,'Undo', 'Redo' ]
	);
	toolbar.bindComposition( composition );

	/**
	 * image source
	 */
	// var imageSource = new circusrs.MockImageSource( { voxelCount: [512, 512, 419], voxelSize: [ 0.572265625, 0.572265625, 1 ] } );
 	// var imageSource = new circusrs.RawVolumeImageSourceWithMock( config );
	var imageSource = new circusrs.HybridImageSource( config );
	// var imageSource = new circusrs.DynamicImageSource( config );
	
	composition.setImageSource( imageSource );

	var axViewer = composition.createViewer( document.querySelector('div#rs-axial'), { stateName: 'axial' } );
	var sagViewer = composition.createViewer( document.querySelector('div#rs-sagittal'), { stateName: 'sagittal' } );
	var corViewer = composition.createViewer( document.querySelector('div#rs-coronal'), { stateName: 'coronal' } );
	var oblViewer = composition.createViewer( document.querySelector('div#rs-oblique'), { stateName: 'oblique' } );
	
	composition.setTool('Brush');
	
	/**
	 * 
	 */
	
	$( '#pen-width' ).on( 'input', function(ev){
		composition.cloudEditor.penWidth = this.value;
	} );
	$( '[name=reset-celestial]' ).on( 'click', function(ev){
		var t = composition.getTool('CelestialRotate');
		t.resetCelestialState( axViewer );
		t.resetCelestialState( sagViewer );
		t.resetCelestialState( corViewer );
		t.resetCelestialState( oblViewer );
		composition.renderAll();
	} );
	$( '[name=reset-hand]' ).on( 'click', function(ev){
		var t = composition.getTool('Hand');
		t.resetTranslateState( axViewer );
		t.resetTranslateState( sagViewer );
		t.resetTranslateState( corViewer );
		t.resetTranslateState( oblViewer );
		composition.renderAll();
	} );
	$( '[name=reset-zoom]' ).on( 'click', function(ev){
		var t = composition.getTool('Hand');
		t.resetZoomState( axViewer );
		t.resetZoomState( sagViewer );
		t.resetZoomState( corViewer );
		t.resetZoomState( oblViewer );
		composition.renderAll();
	} );
	
	imageSource.ready().then( function(){
		var imgState = imageSource.state();
		var dim = imgState.voxelCount;
		var vsize = imgState.voxelSize;
		var cloud = new circusrs.VoxelCloud();
		cloud.label = 'TEST1';
		cloud.color = [0xff,0,0,0x99];
		cloud.setDimension( dim[0], dim[1], dim[2] );
		cloud.setVoxelDimension( vsize[0], vsize[1], vsize[2] );
		composition.clouds.push( cloud );
		composition.editCloud( cloud );
		
		var drawTests = new DrawTests( composition.cloudEditor );
		for( var i in drawTests.__proto__ ){
			$('#draw-test').append(
				$( document.createElement('button') ).attr({
					type: 'button',
					class: 'btn btn-default btn-block btn-xs'
				}).append( i ).on('click', function(){
					var vName = $('#draw-test select').val();
					switch( vName ){
						case 'axial':
							var v = axViewer;
							break;
						case 'sagittal':
							var v = sagViewer;
							break;
						case 'coronal':
							var v = corViewer;
							break;
						case 'oblique':
							var v = oblViewer;
							break;
					}
					(drawTests[ $(this).text() ])(v);
					composition.renderAll();
				})
			);
		}
		
		composition.renderAll();
	} );
}

var DrawTests = ( function(){
	var DrawTests = function( editor ){
		this.editor = editor;
	};
	DrawTests.prototype.dumpState = function( viewer ){
		console.log( viewer.dumpState() );
	};
	DrawTests.prototype.triangle = function( viewer ){
		var e = this.editor; e.prepare( viewer.getState() );
		e.moveTo( 100, 100 );
		e.lineTo(  50, 150 );
		e.lineTo( 150, 150 );
		e.lineTo( 100, 100 );
		e.fill( 100, 125 );
	};
	
	DrawTests.prototype.fillSection = function( viewer ){
		var e = this.editor; e.prepare( viewer.getState() );
		
		e.eachVoxelsOnRect2( 100,100,100,100,function(p){
			e.cloud.writePixelAt( 1, Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]) );
		} );
	};

	DrawTests.prototype.clear = function( viewer ){
		var state = viewer.getState();
		var e = this.editor; e.prepare( state );
// var limit = 500;
		e.eachVoxelsOnRect2( 0,0,viewer.viewState.resolution[0],viewer.viewState.resolution[1],function(p){
			
			var pidx = [ Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]) ];
			
// if( limit-- > 0 ) console.log( pidx.toString() );
		
			if( pidx[0] < 0 || pidx[1] < 0 || pidx[2] < 0
				|| state.voxelCount[0] <= pidx[0]
				|| state.voxelCount[1] <= pidx[1]
				|| state.voxelCount[2] <= pidx[2]
			){
			}else{
				e.cloud.writePixelAt( 0, pidx[0], pidx[1], pidx[2] );
			}
		} );
	};
	
	DrawTests.prototype.fillRect = function( viewer ){
		var e = this.editor; e.prepare( viewer.getState() );
		e.moveTo( 100, 100 );
		e.lineTo( 110, 100 );
		e.lineTo( 110, 110 );
		e.lineTo( 100, 110 );
		e.lineTo( 100, 100 );
		e.fill( 105, 105 );
	};
	
	DrawTests.prototype.aline = function( viewer ){
		var e = this.editor; e.prepare( viewer.getState() );
		e.line( [50, 50], [250,200] );
	};
	DrawTests.prototype.lines = function( viewer ){
		var e = this.editor; e.prepare( viewer.getState() );
		e.line( [50, 50], [250,60] );
		e.line( [50, 50], [250,250] );
		e.line( [50, 50], [60,250] );
	};
	
	DrawTests.prototype.radiation = function( viewer ){
		var e = this.editor; e.prepare( viewer.getState() );
		var o = [ 150, 150 ];
		var r = 100;
		var deg = 0;
		while( deg < 90 ){
			var rad = deg * Math.PI / 180;
			var p0 = [
				o[0] - r * Math.cos( rad ),
				o[1] - r * Math.sin( rad ) ];
			var p1 = [
				o[0] + r * Math.cos( rad ),
				o[1] + r * Math.sin( rad ) ];
			deg+=10;
			
			e.line( [ p0[0], p0[1]-30 ], [ p1[0], p1[1]-30 ] );
			e.line( [ p1[0], p1[1]+30 ], [ p0[0], p0[1]+30 ] );
		}
	};
	
	return DrawTests;
} )();
