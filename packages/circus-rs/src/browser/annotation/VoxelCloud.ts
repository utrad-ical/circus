import { Box2, Box3, Vector2, Vector3 } from 'three';
import { Composition } from '..';
import {
  box2GrowSubpixel,
  getBoxOutline,
  intersectionOfBoxAndPlane,
  Section,
  Vector3D
} from '../../common/geometry';
import RawData from '../../common/RawData';
import MprImageSource from '../image-source/MprImageSource';
import {
  convertPointToMm,
  convertScreenCoordinateToVolumeCoordinate,
  convertSectionToIndex,
  convertVolumeCoordinateToScreenCoordinate
} from '../section-util';
import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';
import { scanBoundingBox } from '../volume-util';
import Annotation from './Annotation';

/**
 * VoxelCloud is a type of Annotation that can be registered to a Composition.
 * This represents one voxel cloud annotation (aka voxel label).
 * An instance of VoxelCloud can be updated manually by the consumer
 * of CIRCUS RS, or automatically by various cloud manipulation tools.
 */
export default class VoxelCloud implements Annotation {
  /**
   * ShadowCanvas is a background canvas used to perform
   * various pixel-based composite operations.
   */
  private static shadowCanvas: HTMLCanvasElement;

  /**
   * Displayed color of the cloud, in the form of '#ff00ff'
   */
  public color?: string;

  /**
   * Alpha value of the cloud, must be between 0.0 and 1.0
   */
  public alpha?: number;

  /**
   * Actual volume data. The pixelFormat must be set to Binary.
   */
  public volume?: RawData;

  /**
   * The position of the origin of this volume data
   * in the voxel coordinate of ImageSource.
   * Should be in voxel coordinate (not in mm)!
   */
  public origin?: [number, number, number];

  /**
   * Determines whether this VoxelCloud is the target of the
   * cloud manipulation tools (e.g., BrushTool, EraserTool).
   */
  public active: boolean = true;

  public id?: string;

  /**
   * If set to true, draws some additional marks useful for debugging.
   */
  public debugPoint: boolean = false;

  private _voxelSize?: Vector3;

  private _expanded: boolean = false;

  get expanded(): boolean {
    return this._expanded;
  }

  /**
   * Prepares a shadow canvas, which is large enough to contain
   * the given size. The shadow canvas can be used to
   * perform background image processing.
   */
  private prepareShadowCanvas(resolution: Vector2): HTMLCanvasElement {
    if (!(VoxelCloud.shadowCanvas instanceof HTMLCanvasElement)) {
      // Create new
      const canvas = document.createElement('canvas');
      canvas.width = resolution.x;
      canvas.height = resolution.y;
      VoxelCloud.shadowCanvas = canvas;
      return canvas;
    }

    // Use the existing one
    const canvas = VoxelCloud.shadowCanvas;
    // Setting the width/height of a canvas makes the canvas cleared
    if (canvas.width < resolution.x) canvas.width = resolution.x;
    if (canvas.height < resolution.y) canvas.height = resolution.y;
    return canvas;
  }

  private toMillimeter(vector: Vector3): Vector3 {
    return new Vector3().multiplyVectors(vector, this._voxelSize!);
  }

  /**
   * Removes zero-area along the bounding box.
   * @returns True if the volume has at least one nonzero voxel
   * and the minimization succeeded
   */
  public shrinkToMinimum(): boolean {
    if (!this.volume || !this.origin) throw new Error();
    // console.time('shrink to minimum bounding box');
    const boundingBox = scanBoundingBox(this.volume);
    if (boundingBox === null) {
      return false; // No nonzero voxel
    }
    this.origin[0] += boundingBox.origin[0];
    this.origin[1] += boundingBox.origin[1];
    this.origin[2] += boundingBox.origin[2];
    this.volume.transformBoundingBox(boundingBox);
    this._expanded = false;
    return true;
    // console.timeEnd('shrink to minimum bounding box');
  }

  /**
   * Expands this volume so that it covers the entire volume of
   * the parent volume image source.
   */
  public expandToMaximum(source: MprImageSource): void {
    if (!this.volume || !source.metadata) throw new Error();
    const voxelCount = source.metadata.voxelCount;
    if (!voxelCount) throw new Error('Voxel count not set');
    const voxelDimension = this.volume.getDimension();
    if (!voxelDimension) throw new Error('Voxel dimension not set');
    const bb: Box3 = new Box3(
      new Vector3(0, 0, 0),
      new Vector3().fromArray(voxelCount)
    );
    if (
      bb.equals(
        new Box3(
          new Vector3(0, 0, 0),
          new Vector3().fromArray(this.volume.getDimension())
        )
      )
    ) {
      return; // Already expanded
    }

    // console.time('expand to maximum');
    this.volume.transformBoundingBox(
      {
        origin: bb.min.toArray() as [number, number, number],
        size: bb.getSize(new Vector3()).toArray() as [number, number, number]
      },
      this.origin
    );
    this.origin = [0, 0, 0];

    this._expanded = true;

    // console.timeEnd('expand to maximum');
  }

  public draw(viewer: Viewer, viewState: ViewState): void {
    if (
      !(this.volume instanceof RawData) ||
      !this.origin ||
      !this.color ||
      !this.alpha
    )
      return;
    if (this.volume.getPixelFormat() !== 'binary') {
      throw new Error('The assigned volume must use binary data format.');
    }
    if (viewState.type !== 'mpr') throw new Error('Unsupported view state.');

    const composition = viewer.getComposition();
    if (!composition) return;
    const imageSource = composition.imageSource as MprImageSource;
    this._voxelSize = new Vector3().fromArray(imageSource.metadata!.voxelSize);

    const context = viewer.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get canvas context');

    const resolution = new Vector2().fromArray(viewer.getResolution());
    const section = viewState.section;

    /*
     * STEP 1. Check if this cloud intersects the current section.
     */
    const mmOrigin = this.toMillimeter(new Vector3().fromArray(this.origin));
    const mmDim = this.toMillimeter(
      new Vector3().fromArray(this.volume.getDimension())
    );
    const intersections = intersectionOfBoxAndPlane(
      new Box3(mmOrigin, new Vector3().addVectors(mmOrigin, mmDim)),
      section
    );

    if (!intersections) {
      // The bounding box of this voxel cloud does not intersect
      // with the section.
      // No need to draw anything.
      return;
    }

    /*
     * STEP 2. Determine the bounding box of intersection points.
     */

    // Converts the 3D intersection points to section-based 2D coordinates
    // and get the box that contains all the intersection points.
    const containingBox = new Box2().makeEmpty();
    intersections.forEach(i => {
      const p2 = convertVolumeCoordinateToScreenCoordinate(
        section,
        resolution,
        i
      );
      containingBox.expandByPoint(p2);
      if (this.debugPoint) circle(context, p2);
    });

    box2GrowSubpixel(containingBox);
    const screenRect: Box2 = new Box2(new Vector2(0, 0), resolution.clone());

    // The final on-screen rectangle inside the canvas
    const outRect = screenRect.intersect(containingBox);
    const outRectSize = outRect.getSize(new Vector2());
    if (outRect.isEmpty() || outRectSize.x === 0 || outRectSize.y === 0) {
      // The voxel cloud will not appear within the rectangle of the screen
      return;
    }

    if (this.debugPoint) rectangle(context, outRect);

    // Calculates the sub-section of the current section which
    // contains the intersection area of this voxel cloud.
    const boundingOrigin = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2(outRect.min.x, outRect.min.y)
    );
    const boundingXAxisEnd = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2(outRect.max.x, outRect.min.y)
    );
    const boundingYAxisEnd = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2(outRect.min.x, outRect.max.y)
    );

    const cloudSection: Section = {
      origin: boundingOrigin.clone().sub(mmOrigin).toArray(),
      xAxis: boundingXAxisEnd.clone().sub(boundingOrigin).toArray(),
      yAxis: boundingYAxisEnd.clone().sub(boundingOrigin).toArray()
    };
    const indexCloudSection: Section = convertSectionToIndex(
      cloudSection,
      this._voxelSize
    );

    /*
     * STEP 3. Create the image data
     */
    const color = [
      parseInt(this.color.substr(1, 2), 16),
      parseInt(this.color.substr(3, 2), 16),
      parseInt(this.color.substr(5, 2), 16),
      Math.round(0xff * this.alpha)
    ];

    // raw section pattern ...
    const sectionImage = new Uint8Array(outRectSize.x * outRectSize.y);
    this.volume.scanObliqueSection(
      indexCloudSection,
      outRectSize.toArray() as [number, number],
      sectionImage
    );

    const imageData = context.createImageData(outRectSize.x, outRectSize.y);
    let srcidx = 0,
      pixel,
      dstidx;
    for (let y = 0; y < outRectSize.y; y++) {
      for (let x = 0; x < outRectSize.x; x++) {
        pixel = sectionImage[srcidx];
        dstidx = srcidx << 2; // meaning multiply 4
        if (pixel === 1) {
          imageData.data[dstidx] = color[0];
          imageData.data[dstidx + 1] = color[1];
          imageData.data[dstidx + 2] = color[2];
          imageData.data[dstidx + 3] = color[3];
        }
        srcidx++;
      }
    }

    // Put the image to the shadow canvas
    const shadow = this.prepareShadowCanvas(outRectSize);
    const shadowContext = shadow.getContext('2d');
    if (!shadowContext) throw new Error('Failed to get canvas context');
    shadowContext.clearRect(0, 0, resolution.x, resolution.y);
    shadowContext.putImageData(imageData, 0, 0);

    // Transfers the image from the shadow canvas to the actual canvas
    context.drawImage(
      shadow,
      0,
      0,
      outRectSize.x,
      outRectSize.y, // src
      outRect.min.x,
      outRect.min.y,
      outRectSize.x,
      outRectSize.y // dest
    );
  }

  public static getBoundingBox(
    composition: Composition,
    data: {
      origin?: Vector3D;
      size?: Vector3D;
    }
  ): { min: Vector3D; max: Vector3D } | undefined {
    if (!data.origin || !data.size) return;

    const src = composition.imageSource as MprImageSource;

    const voxelSize = new Vector3().fromArray(src.metadata!.voxelSize);
    const box = getBoxOutline({ origin: data.origin, size: data.size });

    const min = convertPointToMm(new Vector3().fromArray(box.min), voxelSize);
    const max = convertPointToMm(new Vector3().fromArray(box.max), voxelSize);

    return {
      min: [min.x, min.y, min.z],
      max: [max.x, max.y, max.z]
    };
  }

  public getInternalIndexFromVolumeCoordinate(volumeCoord: Vector3D): Vector3D {
    const origin = this.origin ? this.origin : [0, 0, 0];
    return [
      volumeCoord[0] - origin[0],
      volumeCoord[1] - origin[1],
      volumeCoord[2] - origin[2]
    ];
  }
}
/**
 * For debugging
 */
function circle(
  context: CanvasRenderingContext2D,
  center: Vector2,
  radius: number = 2,
  color: string = 'rgba(255, 0, 0, 1.0)'
): void {
  context.save();
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = color;
  context.fill();
  context.restore();
}

function rectangle(
  context: CanvasRenderingContext2D,
  rect: Box2,
  color: string = 'rgba(128, 128, 128, 1.0)',
  linewidth: number = 1
): void {
  context.save();
  context.beginPath();
  const size = rect.getSize(new Vector2());
  context.rect(rect.min.x, rect.min.y, size.x, size.y);
  context.closePath();
  context.lineWidth = linewidth;
  context.strokeStyle = color;
  context.stroke();
  context.restore();
}
