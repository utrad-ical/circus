import ImageEncoder from './ImageEncoder';
var Png = require('png').Png;

export default class ImageEncoder_nodepng extends ImageEncoder {
	public write(res: any, data: Buffer, width: number, height: number): void {
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
