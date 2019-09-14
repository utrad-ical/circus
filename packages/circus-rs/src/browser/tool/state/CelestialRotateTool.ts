import { Vector3 } from 'three';
import DraggableTool from '../DraggableTool';
import ViewerEvent from '../../viewer/ViewerEvent';
import { Section, vectorizeSection } from '../../../common/geometry';
import { MprViewState, VrViewState } from '../../ViewState';
import { sign } from '../tool-util';
import Viewer from '../../viewer/Viewer';
import { Tool } from '../Tool';

/**
 * CelestialRotateTool handles mouse drags and wheel moves on the Viewer and
 * rotates the MPR section accordingly.
 */
export default class CelestialRotateTool extends DraggableTool implements Tool {
  public activate(viewer: Viewer): void {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.backgroundEventTarget = null;
  }

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
          section = this.rotateAroundYAxis(section, sign(dragInfo.dx) * speed);
        }
        if (Math.abs(dragInfo.dy)) {
          section = this.rotateAroundXAxis(section, sign(dragInfo.dy) * speed);
        }
        const newState: MprViewState = { ...state, section };
        viewer.setState(newState);
        break;
      }
      case 'vr': {
        const speed = ev.original.shiftKey ? 0.5 : 0.2;
        let horizontal =
          typeof state.horizontal !== 'undefined'
            ? state.horizontal + dragInfo.dx * speed
            : 0;
        let vertical =
          typeof state.vertical !== 'undefined'
            ? state.vertical - dragInfo.dy * speed
            : 0;
        // vertical must be between -90 and 90
        if (vertical > 90) {
          const diff = vertical - 90;
          vertical = 90 - diff;
          horizontal = -horizontal;
        } else if (vertical < -90) {
          const diff = -90 - vertical;
          vertical = -90 + diff;
          horizontal = -horizontal;
        }
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
    const radian = (Math.PI / 180.0) * angle;
    const vSection = vectorizeSection(section);
    return {
      origin: vSection.origin
        .sub(rotCenter)
        .applyAxisAngle(rotAxis, radian)
        .add(rotCenter)
        .toArray(),
      xAxis: vSection.xAxis.applyAxisAngle(rotAxis, radian).toArray(),
      yAxis: vSection.yAxis.applyAxisAngle(rotAxis, radian).toArray()
    };
  }

  private rotateAroundYAxis(section: Section, angle: number): Section {
    const vSection = vectorizeSection(section);
    const rotCenter = vSection.origin.add(vSection.xAxis.divideScalar(2));
    const rotAxis = vSection.yAxis.normalize();
    return this.rotate(section, rotAxis, rotCenter, angle);
  }

  private rotateAroundXAxis(section: Section, angle: number): Section {
    const vSection = vectorizeSection(section);
    const rotCenter = vSection.origin.add(vSection.yAxis.divideScalar(2));
    const rotAxis = vSection.xAxis.normalize();
    return this.rotate(section, rotAxis, rotCenter, angle);
  }
}
