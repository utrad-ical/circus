import { mat4, vec3 } from 'gl-matrix';
import { DraggableTool } from '../draggable';
import { ViewerEvent } from '../../viewer/viewer-event';
import { Section } from '../../../common/geometry';
import { MprViewState } from '../../view-state';

/**
 * CelestialRotateTool handles mouse drags and wheel moves on the Viewer and
 * rotates the MPR section accordingly.
 */
export class CelestialRotateTool extends DraggableTool {
  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;
    const speed = ev.original.ctrlKey ? 2.5 : 0.6;

    if (dragInfo.dx === 0 && dragInfo.dy === 0) return;

    const state = ev.viewer.getState();
    switch (state.type) {
      case 'mpr':
        let section = state.section;
        if (Math.abs(dragInfo.dx)) {
          const deg = this.sign(dragInfo.dx) * speed;
          section = this.rotateAroundYAxis(section, deg);
        }
        if (Math.abs(dragInfo.dy)) {
          const deg = this.sign(dragInfo.dy) * speed;
          section = this.rotateAroundXAxis(section, deg);
        }
        const newState: MprViewState = { ...state, section };
        ev.viewer.setState(newState);
        break;
      case 'vr':
        break;
    }
  }

  private rotateAroundYAxis(section: Section, deg: number): Section {
    const radian = Math.PI / 180.0 * deg;
    const end0 = section.xAxis.concat();

    // rotate
    const transform = mat4.rotate(
      mat4.create(),
      mat4.create(),
      radian,
      section.yAxis
    );
    vec3.transformMat4(section.xAxis, section.xAxis, transform);

    const end1 = section.xAxis.concat();

    section.origin[0] -= (end1[0] - end0[0]) / 2;
    section.origin[1] -= (end1[1] - end0[1]) / 2;
    section.origin[2] -= (end1[2] - end0[2]) / 2;

    return section;
  }

  private rotateAroundXAxis(section: Section, deg: number): Section {
    const radian = Math.PI / 180.0 * deg;
    const end0 = section.yAxis.concat();

    // rotate
    const transform = mat4.rotate(
      mat4.create(),
      mat4.create(),
      radian,
      section.xAxis
    );
    vec3.transformMat4(section.yAxis, section.yAxis, transform);

    const end1 = section.yAxis.concat();

    section.origin[0] -= (end1[0] - end0[0]) / 2;
    section.origin[1] -= (end1[1] - end0[1]) / 2;
    section.origin[2] -= (end1[2] - end0[2]) / 2;

    return section;
  }
}
