'use strict'

import { Viewer } from './viewer'

export class ViewerEvent {
  public type: string;
  public original: any; // Event ???
  public viewer: Viewer;
  public canvasX: number;
  public canvasY: number;

  constructor( viewer:Viewer, type:string, original?: any ) {
    this.viewer = viewer;
    this.type = type || original.type;
	if( typeof original !== 'undefined' ){
		this.original = original;
		this.canvasX = original.clientX - original.target.offsetLeft;
		this.canvasY = original.clientY - original.target.offsetTop;
	}
  }
}
