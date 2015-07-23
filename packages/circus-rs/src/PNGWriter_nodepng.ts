import PNGWriter from './PNGWriter';
var Png = require('png').Png;

export default class PNGWriter_nodepng extends PNGWriter{

	protected config: any = null;

	constructor(config: any) {
		super(config);
	}

	protected initialize() {
	}

	public write(res: any, data: Buffer, width: number, height: number): void
	{
		var png = new Png(data, width, height, 'gray', 8);

		png.encode(function (png_data) {
			res.writeHead(200,
			{
				'Content-Type': 'image/png',
				'Access-Control-Allow-Origin': '*'
			});
			res.end(png_data);
		});
	}
}
