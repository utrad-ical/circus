$(function(){
	
	// var axial = circusrs.CrossSectionUtil.getAxial();
	// var sagittal = circusrs.CrossSectionUtil.getSagittal();
	// var coronal = circusrs.CrossSectionUtil.getCoronal();
	
	// circusrs.CrossSectionUtil.getEndPointsOfCrossLine( axial, sagittal );
	
	// return;
	
	var imageSourceSelector = prepareImageSourceSelector();
	
	imageSourceSelector.use('mock').then( function( source ){
		setup( imageSourceSelector, source );
	} );
} );

function setup( imageSourceSelector, defaultSource ){
	
	var dimension = defaultSource.getDimension();
	var windowConfig = // defaultSource.estimateWindow() ||
		{
			level: 138,
			width: 2277			
		};
	
	/**
	 * axial viewer
	 */
	var axialViewer = (function(){
		var state = {
			section: {
				origin: [0,0, dimension[2] / 2 ],
				xAxis: [dimension[0],0,0],
				yAxis: [0,dimension[1],0]
			},
			window: windowConfig
		};
		
		var canvasElement = document.getElementById('rs-canvas');
		var viewer = new circusrs.Viewer( canvasElement );
		viewer.viewState = state;
		imageSourceSelector.addViewer( viewer );
		
		return viewer;
	})();
	
	/**
	 * sagittal viewer
	 */
	var sagittalViewer = (function(){
		var state = {
			section: {
				origin: [dimension[0] / 2, 0, 0 ],
				xAxis: [ 0, dimension[1], 0 ],
				yAxis: [ 0, 0 ,dimension[2] ]
			},
			window: windowConfig
		};
		
		var canvasElement = document.getElementById('rs-sagittal');
		var viewer = new circusrs.Viewer( canvasElement );
		viewer.viewState = state;
		imageSourceSelector.addViewer( viewer );
		
		return viewer;
	})();
	
	/**
	 * coronal viewer
	 */
	var coronalViewer = (function(){
		var state = {
			section: {
				origin: [ 0, dimension[1] / 2, 0 ],
				xAxis: [ dimension[0], 0, 0 ],
				yAxis: [ 0, 0 ,dimension[2] ]
			},
			window: windowConfig
		};
		
		var canvasElement = document.getElementById('rs-coronal');
		var viewer = new circusrs.Viewer( canvasElement );
		viewer.viewState = state;
		imageSourceSelector.addViewer( viewer );
		
		return viewer;
	})();
	
	imageSourceSelector.use('mock');
	
	/**
	 * tool
	 */
	var toolDriver = new circusrs.ToolDriver();
	axialViewer.backgroundEventTarget = toolDriver;
	sagittalViewer.backgroundEventTarget = toolDriver;
	coronalViewer.backgroundEventTarget = toolDriver;
	
	var stateToolSelector = new circusrs.ToolSelector();
	var drawToolSelector = new circusrs.ToolSelector();

	/**
	 * hand tool
	 */
	(function(){
		var tool = new circusrs.HandTool();
		var iconElement = document.querySelector('#tool-icon-hand');
		
		$( iconElement ).on('click', function(){
			drawToolSelector.disactivate();
			tool.activate();
		} );
		tool.on('activate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
			iconElement.className += ' active-tool ';
		} );
		tool.on('disactivate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
		} );
		
		toolDriver.append( tool );
		stateToolSelector.append( tool );
	})();
	
	/**
	 * rotate tool
	 */
	(function(){
		var tool = new circusrs.RotateTool();
		var iconElement = document.querySelector('#celestial-rotate');
		
		$( iconElement ).on('click', function(){
			drawToolSelector.disactivate();
			tool.activate();
		} );
		tool.on('activate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
			iconElement.className += ' active-tool ';
		} );
		tool.on('disactivate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
		} );
		
		toolDriver.append( tool );
		stateToolSelector.append( tool );
	})();
	
	/**
	 * cloud-tool
	 */
	(function(){
		var tool = new circusrs.CloudTool();
		var iconElement = document.querySelector('#tool-icon-brush');
		
		$( iconElement ).on('click', function(){
			if( tool.clouds.length > 0 ){
				tool.activate();
			}else{
				alert('No cloud to write');
			}
		} );
		tool.on('activate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
			iconElement.className += ' active-tool ';
		} );
		tool.on('disactivate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
		} );
		
		axialViewer.painters.push( tool.renderer );
		sagittalViewer.painters.push( tool.renderer );
		coronalViewer.painters.push( tool.renderer );
		
		var $addBtn = $('[name=add-new-cloud]');
		
		var colorCount = 0;
		var colors = [
			[ 0xff, 0, 0, 0xff ],
			[ 0, 0xff, 0, 0xff ],
			[ 0, 0, 0xff, 0xff ],
			[ 0, 0xff, 0xff, 0xff ],
			[ 0xff, 0, 0xff, 0xff ],
			[ 0xff, 0xff, 0, 0xff ]
		];
		var add = function(){
			var color = colors[ colorCount++ % colors.length ];
			var label = 'LABEL' + colorCount.toString();
			var dim = axialViewer.imageSource.getDimension();
			var cloud = new circusrs.VoxelCloud();

			cloud.label = label;
			cloud.color = color;
			cloud.setDimension( dim[0], dim[1], dim[2] );
			
			var $cloudControl = $( document.createElement('div') ).addClass('row').appendTo( $('#clouds') );
			
			
			var $btn = $( document.createElement('button') ).addClass('btn btn-block btn-default btn-xs').append(label).on('click',function(){
				tool.setCloud( cloud );
			}).css('color', 'rgba(' + color.join(',') + ')' ).appendTo(
				$( document.createElement('div') ).addClass('col-xs-4').appendTo($cloudControl)
			);
			
			var $alpha = $( document.createElement('input') ).attr({
				'type': 'range',
				'min': 0,
				'max': 255,
				'value': color[3]
			}).on('input', function(){
				color[3] = Number( $(this).val() );
				axialViewer.render();
			}).appendTo(
				$( document.createElement('div') ).addClass('col-xs-8').appendTo($cloudControl)
			);
			tool.on('cloudchange', function( prev, set ){
				$btn.toggleClass('btn-info', set === cloud).toggleClass('btn-default',set !== cloud);
			});
			
			tool.addCloud( cloud );
			
		};
		$addBtn.on('click', function(){
			add();
		} );
		
		toolDriver.prepend( tool );
		drawToolSelector.append( tool );
	})();
	
	/**
	 * zoom-tool
	 */
	/*
	(function(){
		
		var iconElement = document.getElementById('zoom');
		var tool = new circusrs.ZoomTool();
		
		var ve = viewer.createEvent('someCustomEvent');
		
		viewer.painters.push( tool.icon );
		
	})();
	*/

	/**
	 * state tool
	 */
	var s = new StateViewerControl( document.getElementById('state-canvas') );
	s.observeViewer( axialViewer );
	s.observeViewer( sagittalViewer );
	s.observeViewer( coronalViewer );
	
	Promise.all( [
		axialViewer.render(),
		sagittalViewer.render(),
		coronalViewer.render(),
	] ).then( function(){ s.render(); } );
};


var StateViewerControl = function( canvas ){
	
	this.canvas = canvas;
	this.viewers = [];
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
			new circusrs.CrossSectionObject( this.viewers[i].viewState.section )
		);
	}
		
	this.canvas.getContext('2d').clearRect(0,0, this.canvas.getAttribute('width'), this.canvas.getAttribute('height') );
	this.stateViewer.draw( this.canvas );
};

StateViewerControl.prototype.observeViewer = function( viewer ){
	var self = this;
	viewer.on('statechange', function(){
		self.render();
	} );
	viewer.on('sourcechange', function( prevSource, newSource  ){
		self.setSourceDimension( newSource.getDimension() );
	} );
	this.viewers.push( viewer );
};

