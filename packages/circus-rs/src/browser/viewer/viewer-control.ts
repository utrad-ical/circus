'use strict';

import { Viewer }						from '../../browser/viewer/viewer';
import { CrossSection }					from '../../browser/interface/cross-section';
import { CrossSectionUtil }				from '../../browser/util/cross-section-util';

export class ViewerControl {
	
	public viewer: Viewer;
	private zoom: number = 1.0;
	private scale: number = 0.0;
	private xRotated: number =  0.0;
	private yRotated: number =  0.0;
	private zRotated: number =  0.0;

	private defaultSurface: string = 'axial';
	
	constructor( viewer: Viewer ){
		this.viewer = viewer;
		
		// scale, rotate check ... ?
		this.viewer.on('changestate', ( prev, curr ) => {
		} );
	}
	
	public setWindowLevel( wl: number ){
		let state = this.viewer.getState();

		state.window.level = wl;

		this.viewer.setState( state );
		this.viewer.render();
	}
	
	public getWindowLevel(){
		return this.viewer.viewState.window.level;
	}
	
	public setWindowWidth( ww: number ){
		let state = this.viewer.getState();

		state.window.width = ww;

		this.viewer.setState( state );
		this.viewer.render();
	}

	public getWindowWidth(){
		return this.viewer.viewState.window.width;
	}
	
	public setScale( n: number ){
		let state = this.viewer.getState();

		let zoom = Math.pow( 1.1, n );
		CrossSectionUtil.scale( state.section, zoom / this.zoom );
		this.zoom = zoom;
		this.scale = n;

		this.viewer.setState( state );
		this.viewer.render();
	}
	
	public getScale(){
		return this.scale;
	}
	
	public setRotateX( r: number ){
		let state = this.viewer.getState();

		CrossSectionUtil.rotate( state.section, r - this.xRotated, [1,0,0] );
		this.xRotated = r;

		this.viewer.setState( state );
		this.viewer.render();
	}
	
	public getRotateX(){
		return this.xRotated;
	}

	public setRotateY( r: number ){
		let state = this.viewer.getState();

		CrossSectionUtil.rotate( state.section, r - this.yRotated, [1,0,0] );
		this.yRotated = r;

		this.viewer.setState( state );
		this.viewer.render();
	}

	public getRotateY(){
		return this.yRotated;
	}

	public setRotateZ( r: number ){
		let state = this.viewer.getState();
		
		CrossSectionUtil.rotate( state.section, r - this.zRotated, [1,0,0] );
		this.zRotated = r;

		this.viewer.setState( state );
		this.viewer.render();
	}

	public getRotateZ(){
		return this.zRotated;
	}
}