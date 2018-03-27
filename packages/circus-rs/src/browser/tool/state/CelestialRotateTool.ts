import { Vector3 } from 'three';
import DraggableTool from '../DraggableTool';
import ViewerEvent from '../../viewer/ViewerEvent';
import { Section } from '../../../common/geometry';
import { MprViewState, VrViewState } from '../../ViewState';

/**
 * CelestialRotateTool handles mouse drags and wheel moves on the Viewer and
 * rotates the MPR section accordingly.
 */
export default class CelestialRotateTool extends DraggableTool {
  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const viewer = ev.viewer;
    const dragInfo = this.dragInfo;
    if (dragInfo.dx === 0 && dragInfo.dy === 0) return;

    const state = viewer.getState();
    switch (state.type) {
      case 'mpr': {
        const speed = ev.original.ctrlKey ? 2.5 : 0.6;
        let section = state.section;
        if (Math.abs(dragInfo.dx)) {
          section = this.rotateAroundYAxis(
            section,
            this.sign(dragInfo.dx) * speed
          );
        }
        if (Math.abs(dragInfo.dy)) {
          section = this.rotateAroundXAxis(
            section,
            this.sign(dragInfo.dy) * speed
          );
        }
        const newState: MprViewState = { ...state, section };
        viewer.setState(newState);
        break;
      }
      case 'vr': {
        const speed = ev.original.shiftKey ? 0.5 : 0.2;
        const horizontal =
          typeof state.horizontal !== 'undefined'
            ? state.horizontal + dragInfo.dx * speed
            : 0;
        const vertical =
          typeof state.vertical !== 'undefined'
            ? state.vertical - dragInfo.dy * speed
            : 0;
        const newState: VrViewState = { ...state, horizontal, vertical };
        viewer.setState(newState);
      }
    }
  }

  private rotate(
    section: Section,
    rotAxis: Vector3,
    rotCenter: Vector3,
    angle: number
  ): Section {
    const radian = Math.PI / 180.0 * angle;
    return {
      origin: section.origin
        .clone()
        .sub(rotCenter)
        .applyAxisAngle(rotAxis, radian)
        .add(rotCenter),
      xAxis: section.xAxis.clone().applyAxisAngle(rotAxis, radian),
      yAxis: section.yAxis.clone().applyAxisAngle(rotAxis, radian)
    };
  }

  private rotateAroundYAxis(section: Section, angle: number): Section {
    const rotCenter = section.origin
      .clone()
      .add(section.xAxis.clone().divideScalar(2));
    const rotAxis = section.yAxis.clone().normalize();
    return this.rotate(section, rotAxis, rotCenter, angle);
  }

  private rotateAroundXAxis(section: Section, angle: number): Section {
    const rotCenter = section.origin
      .clone()
      .add(section.yAxis.clone().divideScalar(2));
    const rotAxis = section.xAxis.clone().normalize();
    return this.rotate(section, rotAxis, rotCenter, angle);
  }
}
