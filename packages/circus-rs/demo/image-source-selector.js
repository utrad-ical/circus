var ImageSourceSelector = (function(){
	var ImageSourceSelector = function(){
		
		this.source = null;
		this.viewers = [];
		
		this.server = null;
		this.series = null;
		
		this.mockSource = null;
		this.dynamicSource = null;
		this.rawVolumeSource = null;
	};
	
	// public
	ImageSourceSelector.prototype.addViewer = function( viewer ){
		this.viewers.push( viewer );
	};
	// public
	ImageSourceSelector.prototype.use = function( type, server, series ){
		
		var self = this;
		
		return new Promise( function( resolve, reject ){
			var source;

			switch( type ){
				case 'mock':
					source = self.getMockSource();
					break;
				case 'dynamic':
					self.setup( server, series );
					source = self.getDynamicSource();
					break;
				case 'raw':
					self.setup( server, series );
					source = self.getRawVolumeSource();
					break;
			}
			
			if( source ){
				source.ready().then( function(){
					
					if( self.viewers.length > 0 ){
						var p = [];
						self.viewers.forEach( function( viewer ){
							viewer.setSource( source );
							p.push( viewer.render() );
						} );
						Promise.all( p ).then( function(){
							resolve( source );
						} ).catch( function(e){
							reject(e);
						} );
					}else{
						resolve( source );
					}
				} ).catch( function(e){
					reject(e);
				} );
			}else{
				reject('Canot get source');
			}
		} );
	};
	
	// private
	ImageSourceSelector.prototype.setup = function( server, series ){
		if( server && series && ( this.server !== server || this.series !== series ) ){
			this.server = server;
			this.series = series;
			
			this.mockSource = null;
			this.dynamicSource = null;
			this.rawVolumeSource = null;
		}
	};
	
	// private
	ImageSourceSelector.prototype.getMockSource = function(){
		if( this.mockSource === null )
			this.mockSource = new circusrs.MockImageSource( {
				voxelCount: [ 512, 512, 419 ]
			} );
		return this.mockSource;
	};
	
	// private
	ImageSourceSelector.prototype.getDynamicSource = function(){
		if( !this.server || !this.series ) return null;
		if( this.dynamicSource === null )
			this.dynamicSource = new circusrs.DynamicImageSource( {
				server: this.server,
				series: this.series,
			} );
		return this.dynamicSource;
	};
	
	// private
	ImageSourceSelector.prototype.getRawVolumeSource = function(){
		if( !this.server || !this.series ) return null;
		if( this.rawVolumeSource === null ){
			if( ! window.confirm('Please use your browser developper tool to check loading state, ready ?') ) return ;
			this.rawVolumeSource = new circusrs.RawVolumeImageSource( {
				server: this.server,
				series: this.series,
			} );
		}
		return this.rawVolumeSource;
	};
	
	return ImageSourceSelector;
})();

var prepareImageSourceSelector = function(){

	var sourceSelector = new ImageSourceSelector();

	(function(){
		var config = JSON.parse( localStorage.getItem('rs-demo-save') );
		if ( config ) {
			$('#series').val( config.series );
			$('#server').val( config.server );
			sourceSelector.setup( config.server, config.series );
		}
	})();
	
	$('#use-mock').on( 'click', function(){
		var $btn = $(this);
		var btnLabel = $btn.text();
		$btn.prop('disabled', true).text('Loading ... ');
		sourceSelector.use( 'mock' ).then( function(){
			$btn.prop('disabled', false).text( btnLabel );
		} ).catch( function(e){
			alert(e);
			$btn.prop('disabled', false).text( btnLabel );
		} );
	} );
	
	$('#use-dynamic').on( 'click', function(){
		var config = {
			server: $('#server').val(),
			series: $('#series').val()
		};
		localStorage.setItem( 'rs-demo-save', JSON.stringify( config ) );
		// 
		var $btn = $(this);
		var btnLabel = $btn.text();
		$btn.prop('disabled', true).text('Loading ... ');
		sourceSelector.use( 'dynamic' ).then( function(){
			$btn.prop('disabled', false).text( btnLabel );
		} ).catch( function(e){
			alert(e);
			$btn.prop('disabled', false).text( btnLabel );
		} );
	} );
	
	$('#use-volume').on( 'click', function(){
		var config = {
			server: $('#server').val(),
			series: $('#series').val()
		};
		localStorage.setItem( 'rs-demo-save', JSON.stringify( config ) );
		// 
		var $btn = $(this);
		var btnLabel = $btn.text();
		$btn.prop('disabled', true).text('Loading ... ');
		sourceSelector.use( 'raw' ).then( function(){
			$btn.prop('disabled', false).text( btnLabel );
		} ).catch( function(e){
			alert(e);
			$btn.prop('disabled', false).text( btnLabel );
		} );
	} );
	
	return sourceSelector;
};


