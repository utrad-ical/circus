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
		// 
	})();
	
	if( config ) rs( config );
} );

function rs( config ){
	var composition = new circusrs.Composition();
	var imageSource = new circusrs.HybridImageSource( config );
	
	composition.setImageSource( imageSource );

	var axViewer = composition.createViewer( document.querySelector('div#rs-axial'), { stateName: 'axial' } );
	var sagViewer = composition.createViewer( document.querySelector('div#rs-sagittal'), { stateName: 'sagittal' } );
	var corViewer = composition.createViewer( document.querySelector('div#rs-coronal'), { stateName: 'coronal' } );
	var oblViewer = composition.createViewer( document.querySelector('div#rs-oblique'), { stateName: 'oblique' } );
	
	var toolbar = circusrs.createToolbar( document.querySelector('div#rs-toolbar'), ['Hand','CelestialRotate','Brush','Bucket'] );
	toolbar.bindComposition( composition );
	
	composition.setTool('Brush');
	
	imageSource.ready().then( function(){
		var dim = imageSource.getDimension();
		var vsize = imageSource.voxelSize();
		var cloud = new circusrs.VoxelCloud();
		cloud.label = 'TEST1';
		cloud.color = [0xff,0,0,0xff];
		cloud.setDimension( dim[0], dim[1], dim[2] );
		cloud.setVoxelDimension( vsize[0], vsize[1], vsize[2] );
		composition.clouds.push( cloud );
		composition.editCloud( cloud );
		
		(function(){// fill check
		
			var e = composition.cloudEditor;
			var sample = function( viewer ){
				e.prepare( viewer.viewState.section, viewer.getResolution() );
				e.moveTo( 50, 50 );
				e.lineBy( 30, -30 );
				e.lineBy( 30, 30 );
				e.lineBy( 10, 30 );
				e.lineBy( 50, -30 );
				e.lineBy( 30, 30 );
				e.lineBy( 10, 20 );
				e.lineBy( -40, 20 );
				e.lineBy( -30, -20 );
				e.lineBy( -40, 60 );
				e.lineBy( -20, 20 );
				e.lineBy( -20, -120 );
				e.lineTo( 50, 50 );
				e.fill( 100, 100 );
			};
			sample( axViewer );
			sample( oblViewer );
			composition.renderAll();
		})();
				
	} );
	composition.renderAll();
	
	$( document.getElementById('pen-width') ).on( 'input', function(ev){
		composition.cloudEditor.penWidth = this.value;
	} );
	
	/**
	 * state tool
	 */
	var s = new StateViewerControl( document.getElementById('state-canvas') );
	s.observeViewer( axViewer, 'rgba( 0,0,255,0.2 )' );
	s.observeViewer( sagViewer, 'rgba( 0,255,0,0.2 )' );
	s.observeViewer( corViewer, 'rgba( 255,0,0,0.2 )' );
	s.observeViewer( oblViewer, 'rgba( 128,128,128,0.4 )' );
	
}


var StateViewerControl = function( canvas ){
	
	this.canvas = canvas;
	this.viewers = [];
	this.colors = [];
	this.xRot = 10;
	this.yRot = -105;
	
	this.stateViewer = new circusrs.StateViewer( canvas );
	this.dimension = [100, 100, 100];
	
	this.stateViewer.pan = 1.6;
	this.stateViewer.setCelestialCamera( this.xRot, this.yRot );
	
	var self = this;
	$( 'input#pan-zoom' ).on( 'input', function () {
		self.stateViewer.pan = $(this).val();
		self.render();
	} ).val( this.stateViewer.pan );
	
	$( 'input#cam-rotate-x' ).on( 'input', function () {
		self.stateViewer.setCelestialCamera( $('input#cam-rotate-x').val(), $('input#cam-rotate-y').val() );
		$(this).next().text('(' + $('input#cam-rotate-x').val() + ')');
		self.render();
	} ).val( this.xRot );

	$( 'input#cam-rotate-y' ).on( 'input', function () {
		self.stateViewer.setCelestialCamera( $('input#cam-rotate-x').val(), $('input#cam-rotate-y').val() );
		$(this).next().text('(' + $('input#cam-rotate-y').val() + ')');
		self.render();
	} ).val( this.yRot );
	
	self.render();
	
};

StateViewerControl.prototype.setSourceDimension = function( dim ){
	this.dimension = dim;
};
StateViewerControl.prototype.render = function(){

	this.stateViewer.clearObject();
	
	var volumeModel = new circusrs.WireAxisBoxObject( this.dimension );
	this.stateViewer.addObject( volumeModel );
	
	for( var i = 0; i < this.viewers.length; i++ ){
		this.stateViewer.addObject(
			new circusrs.CrossSectionObject( this.viewers[i].viewState.section , this.colors[i] )
		);
	}
		
	this.canvas.getContext('2d').clearRect(0,0, this.canvas.getAttribute('width'), this.canvas.getAttribute('height') );
	this.stateViewer.draw( this.canvas );
};

StateViewerControl.prototype.observeViewer = function( viewer, color ){
	var self = this;
	viewer.on('statechange', function(){
		self.render();
	} );
	viewer.on('sourcechange', function( prevSource, newSource  ){
		self.setSourceDimension( newSource.getDimension() );
	} );
	this.viewers.push( viewer );
	this.colors.push( color );
};

