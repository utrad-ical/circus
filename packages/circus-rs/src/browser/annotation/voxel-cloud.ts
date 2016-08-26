import { Annotation } from './annotation';
import { Viewer } from '../viewer/viewer';
import { ViewState } from '../view-state';
import { Sprite } from '../viewer/sprite';
import RawData from '../../common/RawData';
import { PixelFormat } from '../../common/PixelFormat';
import { coordinate3D, coordinate2D, getIntersection } from '../geometry';

/**
 * VoxelCloud is a type of Annotation that can be registered to a Composition.
 * This represents one voxel cloud annotation (aka voxel label).
 * An instance of VoxelCloud can be updated manually by the consumer of CIRCUS RS,
 * or automatically by various cloud manipulation tools.
 */
export class VoxelCloud implements Annotation {
	/**
	 * ShadowCanvas is a background canvas used to perform
	 * various pixel-based composite operations.
	 * @type {HTMLCanvasElement}
	 */
	private static shadowCanvas: HTMLCanvasElement;

	/**
	 * Displayed color of the cloud, in the form of '#ff00ff'
	 */
	public color: string;

	/**
	 * Alpha value of the cloud, must be between 0.0 and 1.0
	 */
	public alpha: number;

	/**
	 * Actual volume data. The pixelFormat must be set to Binary.
	 */
	public volume: RawData;

	/**
	 * The position of the origin of this volume data in the voxel coordinate of ImageSource.
	 * Should be in voxel coordinate (not in mm)!
	 */
	public origin: [number, number, number];

	/**
	 * Determines whether this VoxelCloud is the target of the
	 * cloud manipulation tools (e.g., BrushTool, EraserTool).
	 */
	public active: boolean;
	
	/**
	 * Prepares the shadow canvas, which is large enough to contain
	 * the canvas of the given viewer. The shadow canvas can be used to
	 * perform background image processing.
	 * 
	 * このコメントはたぶん誤っています。
	 */
	private prepareShadowCanvas(resolution: [number,number]): HTMLCanvasElement {

		if (!(VoxelCloud.shadowCanvas instanceof HTMLCanvasElement)) {
			const canvas = document.createElement('canvas');
			canvas.width = resolution[0];
			canvas.height = resolution[1];
			VoxelCloud.shadowCanvas = canvas;
			return canvas;
		}
		const canvas = VoxelCloud.shadowCanvas;

		// Setting the width/height of a canvas makes the canvas cleared
		if (canvas.width < resolution[0]) canvas.width = resolution[0];
		if (canvas.height < resolution[1]) canvas.height = resolution[1];
		return canvas;
	}
	
	public mmDim(): [number, number, number] {
		const voxelCount = this.volume.getDimension();
		const voxelSize = this.volume.getVoxelDimension();
		return [
			voxelCount[0] * voxelSize[0],
			voxelCount[1] * voxelSize[1],
			voxelCount[2] * voxelSize[2]
		];
	}

	public draw(viewer: Viewer, viewState: ViewState): Sprite {
		if (!(this.volume instanceof RawData)) return;
		if (this.volume.getPixelFormat() !== PixelFormat.Binary) {
			throw new Error('The assigned volume must use binary data format.');
		}

		const context = viewer.canvas.getContext('2d');
		const resolution = viewer.getResolution();
		const section = viewState.section;

		/**
		 * 1. Checks if this cloud intersects the current section.
		 */
		
			// Top surface: t0-t1-t2-t3, Bottom surface: b0-b1-b2-b3
			//	   T0 ------- T1
			//	  / |        / |
			//	 T3 ------- T2 |
			//	 |  |       |  |
			//	 |  B0 -----|- B1
			//	 | /        | /
			//	 B3 ------- B2
		
		const mmDim = this.mmDim();
		const topVertexes = [
			[ this.origin[0]           , this.origin[1]           , this.origin[2]            ], // T0
			[ this.origin[0] + mmDim[0], this.origin[1]           , this.origin[2]            ], // T1
			[ this.origin[0] + mmDim[0], this.origin[1] + mmDim[1], this.origin[2]            ], // T2
			[ this.origin[0]           , this.origin[1] + mmDim[1], this.origin[2]            ]  // T3
		];
		const bottomVertexes = [
			[ this.origin[0]           , this.origin[1]           , this.origin[2] + mmDim[2] ], // B0
			[ this.origin[0] + mmDim[0], this.origin[1]           , this.origin[2] + mmDim[2] ], // B1
			[ this.origin[0] + mmDim[0], this.origin[1] + mmDim[1], this.origin[2] + mmDim[2] ], // B2
			[ this.origin[0]           , this.origin[1] + mmDim[1], this.origin[2] + mmDim[2] ], // B3
		];
		
		let intersections = [];
		for( let i=0; i<4; i++ ){
			const edge = {
				origin: [ topVertexes[i][0], topVertexes[i][1], topVertexes[i][2] ],
				vector: [
					topVertexes[(i+1)%4][0] - topVertexes[i][0], 
					topVertexes[(i+1)%4][1] - topVertexes[i][1], 
					topVertexes[(i+1)%4][2] - topVertexes[i][2]
				]
			};
			const intersection = getIntersection( section, edge );
			if( intersection !== null )
				intersections.push( intersection );
		}
		for( let i=0; i<4; i++ ){
			const edge = {
				origin: [ bottomVertexes[i][0], bottomVertexes[i][1], bottomVertexes[i][2] ],
				vector: [
					bottomVertexes[(i+1)%4][0] - bottomVertexes[i][0], 
					bottomVertexes[(i+1)%4][1] - bottomVertexes[i][1], 
					bottomVertexes[(i+1)%4][2] - bottomVertexes[i][2]
				]
			};
			const intersection = getIntersection( section, edge );
			if( intersection !== null )
				intersections.push( intersection );
		}
		for( let i=0; i<4; i++ ){
			const edge = {
				origin: [ topVertexes[i][0], topVertexes[i][1], topVertexes[i][2] ],
				vector: [
					bottomVertexes[i][0] - topVertexes[i][0], 
					bottomVertexes[i][1] - topVertexes[i][1], 
					bottomVertexes[i][2] - topVertexes[i][2],
				]
			};
			const intersection = getIntersection( section, edge );
			if( intersection !== null )
				intersections.push( intersection );
		}
		
		if( intersections.length === 0 )
			return null;
		
		/**
		 * 全ての交点(3D)を2Dに変換しながら、その全てを囲むことが出来るキャンバス上の四角を取得
		 */
		let leftTop = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
		let rightBottom = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
		intersections.forEach( i => {
			const p2 = coordinate2D( section, resolution, i );
			
			leftTop[0] = Math.min( leftTop[0], p2[0] );
			leftTop[1] = Math.min( leftTop[1], p2[1] );
			rightBottom[0] = Math.max( rightBottom[0], p2[0] );
			rightBottom[1] = Math.max( rightBottom[1], p2[1] );
			
			// marker for debug!
			circle( context, p2 );
		} );
		
		// marker for debug!
		rectangle( context, leftTop, rightBottom );
		
		/**
		 * 取得した四角の解像度(=サイズ)とクラウド上の3D断面定義を取得
		 */
		const cloudResolution = [
			rightBottom[0] - leftTop[0],
			rightBottom[1] - leftTop[1],
		] as [number,number];
		
		const boundingOrigin = coordinate3D( section, resolution, [ leftTop[0], leftTop[1] ] );
		const boundingXAxisEnd = coordinate3D( section, resolution, [ rightBottom[0], leftTop[1] ] );
		const boundingYAxisEnd = coordinate3D( section, resolution, [ leftTop[0], rightBottom[1] ] );
		
		const cloudSection = {
			origin: [
				boundingOrigin[0] - this.origin[0],
				boundingOrigin[1] - this.origin[1],
				boundingOrigin[2] - this.origin[2]
			] as [number,number,number],
			xAxis: [
				boundingXAxisEnd[0] - boundingOrigin[0],
				boundingXAxisEnd[1] - boundingOrigin[1],
				boundingXAxisEnd[2] - boundingOrigin[2]
			] as [number,number,number],
			yAxis: [
				boundingYAxisEnd[0] - boundingOrigin[0],
				boundingYAxisEnd[1] - boundingOrigin[1],
				boundingYAxisEnd[2] - boundingOrigin[2]
			] as [number,number,number]
		};
		
		/**
		 * 2. 画像データを準備
		 */
		const color = [
			parseInt( this.color.substr(1,2), 16 ),
			parseInt( this.color.substr(3,2), 16 ),
			parseInt( this.color.substr(5,2), 16 ),
			Math.round( 0xff * this.alpha )
		];
		
		/**
		 * scan oblique pattern ...
		 */
		// let o = cloudSection.origin;
		// let u = cloudSection.xAxis.map((i) => i / cloudResolution[0]);
		// let v = cloudSection.yAxis.map((i) => i / cloudResolution[1]);
		// let vs = this.volume.getVoxelDimension();
		// let imageBuffer = new Uint8Array(cloudResolution[0] * cloudResolution[1]);

		// this.volume.scanOblique(
			// [ o[0] / vs[0], o[1] / vs[1], o[2] / vs[2] ],
			// [ u[0] / vs[0], u[1] / vs[1], u[2] / vs[2] ],
			// [ v[0] / vs[0], v[1] / vs[1], v[2] / vs[2] ],
			// cloudResolution,
			// imageBuffer,
			// 1, 0.5
		// );
		
		/**
		 * raw section pattern ... 
		 */
		let rawSection = this.volume.mmGetSection(
			cloudSection.origin,
			cloudSection.xAxis,
			cloudSection.yAxis,
			cloudResolution,
			false
		);

		let imageData = context.createImageData(cloudResolution[0], cloudResolution[1]);
		let srcidx = 0, pixel, dstidx;
		for (var y = 0; y < cloudResolution[1]; y++) {
			for (var x = 0; x < cloudResolution[0]; x++) {
				// pixel = imageBuffer[srcidx]; // scan oblique pattern ...
				pixel = rawSection.read(srcidx); // raw section pattern ...
				dstidx = srcidx << 2; // meaning multiply 4
				if (pixel === 1) {
					imageData.data[dstidx] = color[0];
					imageData.data[dstidx + 1] = color[1];
					imageData.data[dstidx + 2] = color[2];
					imageData.data[dstidx + 3] = color[3];
				}
				// debug!
				else{
					imageData.data[dstidx] = 0xff;
					imageData.data[dstidx + 1] = 0xff;
					imageData.data[dstidx + 2] = 0xff;
					imageData.data[dstidx + 3] = 0xff * 0.2;
				}
				srcidx++;
			}
		}
		
		/**
		 * 裏キャンバスへ書込み
		 */
		
		const shadow = this.prepareShadowCanvas( cloudResolution );
		const shadowContext = shadow.getContext('2d');
		shadowContext.clearRect( 0,0, resolution[0], resolution[1] );
		shadowContext.putImageData( imageData, 0, 0 );
		
		/**
		 * 裏キャンバスから表キャンバスへ転送
		 */
		context.drawImage( shadow,
			0, 0, cloudResolution[0], cloudResolution[1], // src
			leftTop[0], leftTop[1], rightBottom[0] - leftTop[0], rightBottom[1] - leftTop[1], // dest
		);

		return null;
	}

}

/**
 * デバッグ用のキャンバス書き出し
 */

function circle( context, center: [number,number], radius: number = 2, color: string = 'rgba( 255, 0, 0, 1.0 )' ){
	context.save();
	context.beginPath();
	context.arc( center[0], center[1], radius, 0, Math.PI * 2 );
	context.closePath();
	context.fillStyle = color;
	context.fill();
	context.restore();
}
function rectangle( context, leftTop: number[], rightBottom: number[], color: string = 'rgba( 128, 128, 128, 1.0 )', linewidth: number = 1 ){
	context.save();
	context.beginPath();
	context.rect( leftTop[0], leftTop[1], rightBottom[0] - leftTop[0], rightBottom[1] - leftTop[1] );
	context.closePath();
	context.lineWidth = linewidth;
	context.strokeStyle = color;
	context.stroke();
	context.restore();
}
