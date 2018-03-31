import { Vector2, Vector3 } from 'three';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';
import ViewerEvent from '../../viewer/ViewerEvent';
import { convertScreenCoordinateToVolumeCoordinate } from '../../section-util';
import { Section, vectorizeSection } from '../../../common/geometry';

/**
 * ZoomTool
 */
export default class ZoomTool extends DraggableTool {
  /**
   * Holds the current zoom step relative to the drag start time
   */
  private currentStep: number | undefined;

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
    const direction = this.sign(ev.original.deltaY);
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
        const vp = viewer.getResolution();
        if (!screenCenter) screenCenter = new Vector2(vp[0] / 2, vp[1] / 2);
        const volumeCenter = convertScreenCoordinateToVolumeCoordinate(
          section,
          new Vector2(vp[0], vp[1]),
          screenCenter
        );
        const newState = {
          ...state,
          section: this.scaleSection(section, stepFactor ** step, volumeCenter)
        };
        viewer.setState(newState);
        break;
      case 'vr':
        break;
    }
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
