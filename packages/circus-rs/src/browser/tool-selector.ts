'use strict';

import { Painter } from './painter-interface';
import { Sprite } from './sprite';
import { ImageSource } from './image-source';
import { ViewerEvent } from './viewer-event';
import { ViewerEventTarget } from './viewer-event-target';

import { EventEmitter } from 'events';

export class ToolSelector extends EventEmitter {

	private viewer;
	private tools;
	private icons;
	private focusId;

	constructor( viewer ) {
		super();
		this.viewer = viewer;
		this.focusId = null;
		this.tools = {};
		this.icons = {};
	}
	
	public append( id, tool, icon ){
		this.tools[id] = tool;
		this.icons[id] = icon;
	}
	
	public select( id ){
		if( this.tools[id] && this.focusId !== id ){
			if( this.focusId ){
				this.tools[this.focusId].emit( 'blur', this.viewer );
				this.icons[this.focusId].emit( 'blur', this.viewer );
			}
			this.focusId = id;
			this.tools[id].emit( 'focus', this.viewer );
			this.icons[id].emit( 'focus', this.viewer );
		}
	}


}
