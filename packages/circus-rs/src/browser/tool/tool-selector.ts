'use strict';

import { EventEmitter } from 'events';
import { Tool }							from '../../browser/tool/tool';
import { Viewer }						from '../../browser/viewer/viewer';
import { ViewerEvent }					from '../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../browser/interface/viewer-event-target';

export class ToolDriver extends Tool implements ViewerEventTarget {

	private tools: Tool[] = [];

	constructor( ) {
		super();
	}
	
	public append( tool: Tool ){
		this.tools.push( tool );
	}
	public prepend( tool: Tool ){
		this.tools.unshift( tool );
	}
	
	public mouseupHandler(viewerEvent: ViewerEvent){
		for( let i = 0; i < this.tools.length; i++ ){
			if( this.tools[i].active ) viewerEvent.dispatch( this.tools[i] );
		}
	}
	public mousedownHandler(viewerEvent: ViewerEvent){
		for( let i = 0; i < this.tools.length; i++ ){
			if( this.tools[i].active ) viewerEvent.dispatch( this.tools[i] );
		}
	}
	public mousemoveHandler(viewerEvent: ViewerEvent){
		for( let i = 0; i < this.tools.length; i++ ){
			if( this.tools[i].active ) viewerEvent.dispatch( this.tools[i] );
		}
	}
	public mousewheelHandler(viewerEvent: ViewerEvent){
		for( let i = 0; i < this.tools.length; i++ ){
			if( this.tools[i].active ) viewerEvent.dispatch( this.tools[i] );
		}
	}
}

export class ToolSelector {
	
	public tools: Tool[];
	public current: Tool;
	
	constructor(){
		this.tools = [];
	}
	
	public append( tool: Tool ){
		this.tools.push( tool );
		tool.on('activate', () => { this.disactivateElse( tool ) } );
	}
	
	private disactivateElse( current ){
		if( current !== this.current ){
			this.tools.forEach( ( tool ) => {
				if( tool !== current ) tool.disactivate();
			} );
			this.current = current;
		}
	}

	public disactivate(){
		if( this.current ) this.current.disactivate();
		this.current = null;
	}
}

