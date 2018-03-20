import { Vector2, Vector3 } from 'three';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';
import ViewerEvent from '../../viewer/ViewerEvent';
import { convertScreenCoordinateToVolumeCoordinate } from '../../section-util';
import { Vector2D, Section } from '../../../common/geometry';

/**
 * ZoomTool
 */
export default class ZoomTool extends DraggableTool {
  /**
   * Holds the current zoom step relative to the drag start time
   */
  private currentStep: number;

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;
    const step = Math.round(dragInfo.totalDy / 15);
    if (step !== this.currentStep) {
      this.zoomStep(ev.viewer, step - this.currentStep, [
        ev.viewerX,
        ev.viewerY
      ]);
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
    this.zoomStep(ev.viewer, speed * direction, [ev.viewerX, ev.viewerY]);
  }

  private zoomStep(viewer: Viewer, step: number, center?: Vector2D): void {
    const stepFactor = 1.05;
    const state: ViewState = viewer.getState();
    switch (state.type) {
      case 'mpr':
        const section = state.section;
        const vp = viewer.getResolution();
        if (!center) center = [vp[0] / 2, vp[1] / 2];
        const focus = convertScreenCoordinateToVolumeCoordinate(
          section,
          vp,
          center
        );
        const newState = {
          ...state,
          section: this.scaleSection(
            section,
            stepFactor ** step,
            new Vector3().fromArray(focus)
          )
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
    center: Vector3
  ): Section {
    return {
      origin: section.origin
        .clone()
        .sub(center)
        .multiplyScalar(scale)
        .add(center),
      xAxis: section.xAxis.clone().multiplyScalar(scale),
      yAxis: section.yAxis.clone().multiplyScalar(scale)
    };
  }
}
