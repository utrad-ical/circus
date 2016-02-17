/**
 * handle text appended to arrow annotation
 * @class
 */
type point2D = {x: number, y: number};
export class ArrowText{
	private text: string;
	private font: string = "20pt メイリオ,Meiryo";
	private color: string = "#ffffff";
	private offset: [number, number] = [20, 20];

	public set setFont(font: string){
		if(font !== "") {
			this.font = font;
		}
	}
	public set setColor(color: string){
		if(color !== "") {
			this.color = color;
		}
	}
	public set setOffset(offset: [number, number]){
		this.offset = offset;
	}

	public get getText(){
		return this.text;
	}
	public get getFont(){
		return this.font;
	}
	public get getColor(){
		return this.color;
	}
	public get getOffset(){
		return this.offset;
	}
	constructor(text: string) {
		this.text = text;
	}
	public draw(ctx, tail: point2D): void{
		ctx.font = this.font;
		ctx.fillStyle = this.color;
		ctx.fillText(this.text,
			tail.x + this.offset[0],
			tail.y + this.offset[1]);
	}
}