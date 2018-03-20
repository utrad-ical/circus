import { mat4, vec3 } from 'gl-matrix';
import { Vector3 } from 'three';
import DraggableTool from '../DraggableTool';
import ViewerEvent from '../../viewer/ViewerEvent';
import { Section } from '../../../common/geometry';
import { MprViewState } from '../../ViewState';

/**
 * CelestialRotateTool handles mouse drags and wheel moves on the Viewer and
 * rotates the MPR section accordingly.
 */
export default class CelestialRotateTool extends DraggableTool {
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
    const end0 = section.xAxis.clone();

    // rotate
    const transform = mat4.rotate(
      mat4.create(),
      mat4.create(),
      radian,
      section.yAxis.toArray()
    );
    const newXAxis = vec3.transformMat4(
      vec3.create(),
      section.xAxis.toArray(),
      transform
    );
    section.xAxis = new Vector3().fromArray(newXAxis);

    const end1 = section.xAxis.clone();

    section.origin.sub(
      new Vector3().subVectors(end1, end0).multiplyScalar(0.5)
    );
    return section;
  }

  private rotateAroundXAxis(section: Section, deg: number): Section {
    const radian = Math.PI / 180.0 * deg;
    const end0 = section.yAxis.clone();

    // rotate
    const transform = mat4.rotate(
      mat4.create(),
      mat4.create(),
      radian,
      section.xAxis.toArray()
    );
    const newYAxis = vec3.transformMat4(
      vec3.create(),
      section.yAxis.toArray(),
      transform
    );
    section.yAxis = new Vector3().fromArray(newYAxis);

    const end1 = section.yAxis.clone();

    section.origin.sub(
      new Vector3().subVectors(end1, end0).multiplyScalar(0.5)
    );

    return section;
  }
}
