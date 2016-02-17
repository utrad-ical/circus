/**
 * handle text appended to arrow annotation
 * @class
 */
type point2D = {x: number, y: number};
export class PointText{
	private text: string;
	private font: string = "16pt メイリオ,Meiryo";
	private color: [number, number, number, number] = [255, 255, 255, 1];//RGBA
	private saveColor: [number, number, number, number];//used temporarily
	private attractColor: [number, number, number, number] = [0, 255, 0, 1];
	private offset: [number, number] = [20, 20];

	public setFont(font: string): void{
		if(font !== "") {
			this.font = font;
		}
	}
	public setColor(color: [number, number, number, number]): void{
		this.color = color;
	}
	public setAttractColor(color: [number, number, number, number]): void{
		this.attractColor = color;
	}
	public setOffset(offset: [number, number]): void{
		this.offset = offset;
	}
	public setText(text: string): void{
		this.text = text;
	}

	public getText(): string{
		return this.text;
	}
	public getFont(): string{
		return this.font;
	}
	public getColor(): [number, number, number, number]{
		return this.color;
	}
	public getOffset(): [number, number]{
		return this.offset;
	}
	constructor(text: string) {
		this.text = text;
		this.saveColor = [0, 0, 0, 0];
	}
	public draw(ctx, tail: point2D, zoom: number): void{
		ctx.font = this.font;
		let colorString = this.color.join(",");
		colorString = "rgba(" + colorString + ")";
		ctx.fillStyle = colorString;
		ctx.fillText(this.text,
			tail.x + this.offset[0] * zoom,
			tail.y + this.offset[1] * zoom);
	}
	public changeAttractColor(): void{
		for (var i = 0; i < this.color.length; ++i) {
			this.saveColor[i] = this.color[i];//save color
			this.color[i] = this.attractColor[i];//change color
		}
	}
	public recoverColor(): void{
		for (var i = 0; i < this.color.length; ++i) {
			this.color[i] = this.saveColor[i];//write back
		}
	}
}