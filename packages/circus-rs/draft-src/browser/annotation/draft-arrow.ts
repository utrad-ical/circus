'use strict';

import { Sprite } from '../sprite';
import { VolumeViewState } from '../volume-view-state';
import { Annotation } from './annotation';
import { ArrowStyle } from './draft-arrow-style';
import { ArrowText } from './draft-arrow-text';


type Point2 = number[];
type Point3 = number[];
type Vector3 = number[];
type point2D = {x: number, y: number};

/**
 * annotation class drawing arrow with text
 * @class
 */
export class ArrowAnnotation extends Annotation {

	private pointAt: Point3;
	private arrowVector: Vector3;
	private arrowText: ArrowText;
	private arrowStyle: ArrowStyle;

	public set setPointAt(p: Point3){
		this.pointAt = p;
	}
	public set setArrowVector(v: Vector3){
		this.arrowVector = v;
	}
	public set setArrowStyle(style: ArrowStyle){
		this.arrowStyle = style;
	}
	constructor(point: Point3, vec: Vector3, textObj: ArrowText){
		this.pointAt = point;
		this.arrowVector = vec;
		this.arrowText = textObj;
		this.arrowStyle = new ArrowStyle();
		super();
	}

	public draw(canvasDomElement:HTMLCanvasElement, viewState:VolumeViewState):Sprite {
		var ctx = canvasDomElement.getContext('2d');

		// 3D(Point3) -> 2D(point2D) by using VolumeViewState
		let head3D: Point3 = viewState.coordinateVoxelToPixel(
				this.pointAt[0],
				this.pointAt[1],
				this.pointAt[2] );
		let tail3D: Point3 = viewState.coordinateVoxelToPixel(
				this.pointAt[0] - this.arrowVector[0],
				this.pointAt[1] - this.arrowVector[1],
				this.pointAt[2] - this.arrowVector[2] );

		let head: point2D = {"x" : head3D[0], "y" : head3D[1]};
		let tail: point2D = {"x" : tail3D[0], "y" : tail3D[1]};

		//---------------------------------
		if(Math.abs(head3D[2]) < 5) {//display arrow if head of arrow is near the view surface
			ctx.save();
			//set length of arrow tail
			let len: number = this.calcTailLength(head, tail);
			if (len < 20) {
				len = 20;
			}
			//translate
			ctx.translate(head.x, head.y);
			//rotate
			let rad: number = this.calcRadian(head, tail);
			ctx.rotate(rad);
			//draw
			this.drawArrow(ctx, len);
			//reset draw area
			ctx.restore();
			//draw string
			this.arrowText.draw(ctx, tail);
		}
		//---------------------------------
		return null;
	}
	//-----------------------------------------
	/**
	 * draw arrow
	 * @private
	 */
	private drawArrow(ctx, len: number): void {
		let arrowPath = [
			[0, 0],
			[this.arrowStyle.getArrowTriangleHeight, 10],
			[this.arrowStyle.getArrowTriangleHeight, 3],
			[len, 3],//tail edge
			[len, -3],//tail edge
			[this.arrowStyle.getArrowTriangleHeight, -3],
			[this.arrowStyle.getArrowTriangleHeight, -10]
		];

		ctx.beginPath();
		ctx.lineWidth = this.arrowStyle.getLineWidth;
		ctx.moveTo(arrowPath[0][0], arrowPath[0][1]);
		for (let i: number = 1; i < arrowPath.length; i++) {
			ctx.lineTo(arrowPath[i][0], arrowPath[i][1]);
			// console.log(arrowPath[i][0] + "_:_" + arrowPath[i][1]);
		}
		ctx.closePath();
		ctx.strokeStyle = this.arrowStyle.getStrokeColor;
		ctx.stroke();
		ctx.fillStyle = this.arrowStyle.getFillColor;
		ctx.fill();
	}
	/**
	 * calc tail length
	 * @private
	 */
	private calcTailLength(pointHead: { x: number, y: number }, pointTail: { x: number, y: number }): number {
		let x: number = Math.abs(pointHead.x - pointTail.x);
		let y: number = Math.abs(pointHead.y - pointTail.y);
		let len2: number = x * x + y * y;
		return Math.round(Math.sqrt(len2));//round square root
	}
	/**
	 * calc radian
	 * @private
	 */
	private calcRadian(pointHead: { x: number, y: number }, pointTail: { x: number, y: number }): number {
		//set pointTail to origin => minus pointTail from pointHead
		let fixX: number = pointHead.x - pointTail.x;
		let fixY: number = pointHead.y - pointTail.y;
		// console.log(fixX + "_:_" + fixY);
		if (fixX === 0 || fixY === 0) {
			return 0;
		}
		let lenA: number = 1;//basic length X.
		let lenB: number = Math.sqrt((fixX * fixX + fixY * fixY));//三角関数
		let innerProduct: number = 1 * fixX + 0 * fixY;//[1, 0] inner product
		let cosTheta: number = innerProduct / (lenA * lenB);//calc cosΘ
		let rad: number = Math.acos(cosTheta);//calc radian
		if (pointTail.y > pointHead.y) {
			rad += Math.PI;
		}
		//upset
		if (pointTail.y > pointHead.y) {
			let diffRadian: number = rad - Math.PI;
			rad = rad - diffRadian * 2;
		}
		if (pointTail.y < pointHead.y) {
			rad += Math.PI;
		}
		return rad;
	}
}
