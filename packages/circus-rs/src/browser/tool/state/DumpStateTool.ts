import Viewer from '../../viewer/Viewer';
import ToolBaseClass, { Tool } from '../Tool';

/**
 * DumpStateTool
 */
export default class DumpStateTool extends ToolBaseClass implements Tool {
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
        console.log(viewer.getState());
      }
      viewer.setActiveTool(undefined);
    });
    // clear tool state
    this.viewers = [];
    this.wait = false;
  }

  public deactivate(viewer: Viewer): void {}
}

export function createDumpStateTool(targetIndex: number = 0) {
  return new DumpStateTool(targetIndex);
}
