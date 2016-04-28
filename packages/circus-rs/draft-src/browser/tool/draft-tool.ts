'use strict';

import { EventEmitter } from 'events';

import { Viewer } from '../viewer'
import { Sprite } from '../sprite'
import { ViewerEvent } from '../viewer-event'
import { ViewerEventCapture } from '../viewer-event-capture-interface'
import { ToolSprite } from '../annotation/draft-tool-sprite'

type Capturing = boolean;

export class Tool extends EventEmitter implements ViewerEventCapture {
	private x: number;
	private y: number;
	private width: number;
	private height: number;
	private positionX: number;
	private positionY: number;
	private imageURL: string;
	public cursor: string;
	private iconImage: HTMLImageElement;
	constructor(opt){
		super();
		let {x = 20, y = 20, image = "", width = 32, height = 32, positionX = 0, positionY = 0, cursor = "default"} = opt;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = width;
		this.positionX = positionX;
		this.positionY = positionY;
		this.imageURL = image;
		this.cursor = cursor;
		let img = new Image();
		img.src = this.imageURL;
		img.width = this.width;
		img.height = this.height;
		img.onload = (d)=>{
			this.iconImage = img;
			this.emit('ready');
		};
	}
	public draw( canvasDomElement, viewState ){
		if(this.iconImage) {
			var ctx = canvasDomElement.getContext("2d");
			// ctx.drawImage(this.iconImage, this.x, this.y);
			//draw background
			ctx.fillStyle = "rgba(255,255,255,1.0)";
			ctx.fillRect(this.x, this.y, this.width, this.height);
			ctx.drawImage(this.iconImage, this.positionX, this.positionY, this.width, this.height, this.x, this.y, this.width, this.height);
			// return new ToolSprite(this);
		}

	}
	public createSprite(){
		return new ToolSprite(this);
	}
	public isOnTheToolImage(x: number, y: number): boolean{
		let isOnWidth = (this.x <= x && x <= this.x + this.width);
		let isOnHeight = (this.y <= y && y <= this.y + this.height);
		return isOnWidth && isOnHeight;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
	public mousedownHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
}
