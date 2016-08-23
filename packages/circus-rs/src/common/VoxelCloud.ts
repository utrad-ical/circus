import { mat4, vec3 } from 'gl-matrix';
import RawData from './RawData';
import { PixelFormat } from "./PixelFormat";

type RGBA = [number, number, number, number];
type Vector3D = [number, number, number];
type Vector2D = [number, number];

export class VoxelCloud extends RawData {
	public label: string;
	public offset: Vector3D;
	public fillSize: Vector3D;
	public color: RGBA;

	public padding: Vector2D; // Number of pixels in a slice must be a multiple of 8.

	public setDimension(x: number, y: number, z: number): void {
		this.offset = [ 0, 0, 0 ];
		this.fillSize = [ x, y, z ];
		super.setDimension( x, y, z, PixelFormat.Binary );
	}

	/**
	 * ボリュームを最小化
	 */
	private expanded: boolean = true;

	public shrink(): void {
	}
	public expand(): void {
	}
}
