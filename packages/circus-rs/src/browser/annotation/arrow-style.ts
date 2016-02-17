/**
 * handle arrow style of arrow-annotation
 * @class
 */
export class ArrowStyle{
	private arrowTriangleHeight: number = 20;
	private fillColor: string = "#888888";
	private strokeColor: string = "#ffffff";
	private lineWidth: number = 3;

	public set setArrowTriangleHeight(height: number){
		if(height > 0) {
			this.arrowTriangleHeight = height;
		}
	}
	public set setFillColor(color: string){
		this.fillColor = color;
	}
	public set setStrokeColor(color: string){
		this.strokeColor = color;
	}
	public set setLineWidth(width: number){
		this.lineWidth = width;
	}

	public get getArrowTriangleHeight(){
		return this.arrowTriangleHeight;
	}
	public get getFillColor(){
		return this.fillColor;
	}
	public get getStrokeColor(){
		return this.strokeColor;
	}
	public get getLineWidth(){
		return this.lineWidth;
	}
	constructor(height?: number) {
		if(height && height > 0) {
			this.arrowTriangleHeight = height;
		}
	}
}