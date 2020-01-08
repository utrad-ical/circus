import { Vector3 } from 'three';
import { Section, vectorizeSection } from '../../../common/geometry/Section';
import Viewer from '../../viewer/Viewer';
import ToolBaseClass, { Tool } from '../Tool';

/**
 * StaticRotation
 */
export default class StaticRotationTool extends ToolBaseClass implements Tool {
  private angle: [number, number];
  private targetIndex: number;
  private viewers: Viewer[] = [];
  private wait: boolean = false;

  constructor(angle: [number, number], targetIndex: number = 0) {
    super();
    this.angle = angle;
    this.targetIndex = targetIndex;
  }

  public activate(viewer: Viewer): void {
    this.viewers.push(viewer);

    if (!this.wait) {
      this.wait = true;
      setTimeout(() => this.run(), 50);
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

  private run(): void {
    this.viewers.forEach((viewer, i) => {
      const state = viewer.getState();

      if (state.type === 'mpr' && i === this.targetIndex) {
        const [aroundXAxis, aroundYAxis] = this.angle;
        let section = state.section;
        if (aroundXAxis) section = this.rotateAroundXAxis(section, aroundXAxis);
        if (aroundYAxis) section = this.rotateAroundYAxis(section, aroundYAxis);
        viewer.setState({ ...state, section });
      }
      viewer.setActiveTool(undefined);
    });
    // clear tool state
    this.viewers = [];
    this.wait = false;
  }

  public deactivate(viewer: Viewer): void {}
}

export function createStaticRotationTool(
  angle: [number, number],
  targetIndex: number = 0
) {
  return new StaticRotationTool(angle, targetIndex);
}
