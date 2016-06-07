'use strict';

import { EventEmitter } from 'events';
export class Icon extends EventEmitter {
	
	private iconElement;
	
	constructor( iconElement ){
		super();
		this.iconElement = iconElement;
		this.on('focus', function(){
			this.iconElement.className = this.iconElement.className+' focus';
		});
		this.on('blur', function(){
			this.iconElement.className = this.iconElement.className.replace(' focus','');
		});
	}
	
	public on( type: string, handler: Function ): EventEmitter {
		switch( type ){
			case 'click':
				this.iconElement.addEventListener(type, handler);
				break;
			default:
				super.on( type, handler );
		}
		return this;
	}
}
