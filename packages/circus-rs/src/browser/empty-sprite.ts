'use strict';

import { Sprite } from './sprite';
import { ViewerEvent } from './viewer-event';

export class EmptySprite extends Sprite {
	constructor( ...arg: any[] ) {
		super();
	}
	public hitTest( event:ViewerEvent ):boolean {
		return false;
	}
}