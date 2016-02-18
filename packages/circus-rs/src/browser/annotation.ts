'use strict';

import { Sprite } from './sprite';
import { ViewState } from './view-state';

export abstract class Annotation {
	private collectionId: number;
	public abstract draw( canvasDomElement:HTMLCanvasElement, viewState:ViewState ):Sprite;
	public setId( id: number ): void {
		this.collectionId = id;
	}
}
