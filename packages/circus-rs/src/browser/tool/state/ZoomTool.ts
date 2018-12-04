import { Vector2, Vector3 } from 'three';
import { Section, vectorizeSection } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import { DicomVolumeMetadata } from '../../image-source/volume-loader/DicomVolumeLoader';
import {
  convertScreenCoordinateToVolumeCoordinate,
  sectionOverlapsVolume
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../../ViewState';
import DraggableTool from '../DraggableTool';
import { sign } from "../tool-util";
import { Tool } from '../Tool';

/**
 * ZoomTool
 */
export default class ZoomTool extends DraggableTool implements Tool {
  /**
   * Holds the current zoom step relative to the drag start time
   */
  private currentStep: number | undefined;

  public activate(viewer: Viewer) {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer) {
    viewer.backgroundEventTarget = null;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;
    const step = Math.round(dragInfo.totalDy / 15);
    if (step !== this.currentStep) {
      this.zoomStep(
        ev.viewer,
        step - this.currentStep!,
        new Vector2(ev.viewerX, ev.viewerY)
      );
      this.currentStep = step;
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    this.currentStep = 0;
  }

  public wheelHandler(ev: ViewerEvent): void {
    const speed = ev.original.shiftKey ? 3 : 1;
    const direction = sign(ev.original.deltaY);
    this.zoomStep(
      ev.viewer,
      speed * direction,
      new Vector2(ev.viewerX, ev.viewerY)
    );
  }

  private zoomStep(viewer: Viewer, step: number, screenCenter?: Vector2): void {
    const stepFactor = 1.05;
    const state: ViewState = viewer.getState();

    switch (state.type) {
      case 'mpr':
        const section = state.section;
        const resolution = viewer.getResolution();

        const comp = viewer.getComposition();
        if (!comp) throw new Error('Composition not initialized'); // should not happen
        const src = comp.imageSource as MprImageSource;
        if (!(src instanceof MprImageSource)) return;

        if (!screenCenter)
          screenCenter = new Vector2(resolution[0] / 2, resolution[1] / 2);
        const volumeCenter = convertScreenCoordinateToVolumeCoordinate(
          section,
          new Vector2(resolution[0], resolution[1]),
          screenCenter
        );

        viewer.setState(
          this.translateBy(
            state,
            stepFactor ** step,
            volumeCenter,
            new Vector2().fromArray(resolution),
            src.metadata!
          )
        );

        break;
      case 'vr':
        break;
    }
  }

  private translateBy(
    state: MprViewState,
    scale: number,
    volumeCenter: Vector3,
    resolution: Vector2,
    metadata: DicomVolumeMetadata
  ): MprViewState {
    const mmSection = this.scaleSection(state.section, scale, volumeCenter);

    const overlap = sectionOverlapsVolume(
      mmSection,
      resolution,
      new Vector3().fromArray(metadata.voxelSize),
      new Vector3().fromArray(metadata.voxelCount)
    );

    return overlap ? { ...state, section: mmSection } : state;
  }

  private scaleSection(
    section: Section,
    scale: number,
    volumeCenter: Vector3
  ): Section {
    const vSection = vectorizeSection(section);
    return {
      origin: vSection.origin
        .sub(volumeCenter)
        .multiplyScalar(scale)
        .add(volumeCenter)
        .toArray(),
      xAxis: vSection.xAxis.multiplyScalar(scale).toArray(),
      yAxis: vSection.yAxis.multiplyScalar(scale).toArray()
    };
  }
}
