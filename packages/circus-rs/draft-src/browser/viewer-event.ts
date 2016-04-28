'use strict'

import { Viewer } from './viewer'

export class ViewerEvent {
	public type: string;
	public original: any;
	private propagation: boolean;

	public viewer: Viewer;

	constructor( viewer:Viewer, type:string, original?: any ) {
		this.viewer = viewer;
		this.type = type || ( original ? original.type : null );
		this.original = original;
		this.propagation = true;
	}
	
	public stopPropagation(){
		this.propagation = false;
	}
	public dispatch( element ){
		let handler = this.type + 'Handler';
		if( this.propagation && element[handler] && typeof element[handler] === 'function' ){
			let retval = element[handler](this);
			if( retval === false ) this.stopPropagation();
		}
	}
}
