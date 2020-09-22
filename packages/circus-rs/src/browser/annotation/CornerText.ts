import Annotation from './Annotation';
import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';

const PADDING = 10;

export default class CornerText implements Annotation {
  public id?: string;

  public draw(viewer: Viewer, viewState: ViewState): void {
    if (!viewer || !viewState) return;
    const canvas = viewer.canvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = viewer.getState();

    const lines =
      state.type === 'mpr'
        ? [JSON.stringify(state.window), JSON.stringify(state.section)]
        : JSON.stringify(state);
    const vp = viewer.getViewport();

    try {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillStyle = 'yellow';
      ctx.font = '13px Arial';
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], vp[0] - PADDING, 15 * (i + 1));
      }
    } finally {
      ctx.restore();
    }
  }
}
