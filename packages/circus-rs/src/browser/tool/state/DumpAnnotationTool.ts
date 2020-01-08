import Viewer from '../../viewer/Viewer';
import ToolBaseClass, { Tool } from '../Tool';

/**
 * DumpAnnotationTool
 */
export default class DumpAnnotationTool extends ToolBaseClass implements Tool {
  private targetIndex: number;
  private viewers: Viewer[] = [];
  private wait: boolean = false;

  constructor(targetIndex: number = 0) {
    super();
    this.targetIndex = targetIndex;
  }

  public activate(viewer: Viewer): void {
    this.viewers.push(viewer);

    if (!this.wait) {
      this.wait = true;
      setTimeout(() => this.run(), 50);
    }
  }

  private run(): void {
    this.viewers.forEach((viewer, i) => {
      if (i === this.targetIndex) {
        console.log('----- ' + i.toString() + ' -----');
        const comp = viewer.getComposition();
        console.log(comp ? comp.annotations : undefined);
      }
      viewer.setActiveTool(undefined);
    });
    // clear tool state
    this.viewers = [];
    this.wait = false;
  }

  public deactivate(viewer: Viewer): void {}
}

export function createDumpAnnotationTool(targetIndex: number = 0) {
  return new DumpAnnotationTool(targetIndex);
}
