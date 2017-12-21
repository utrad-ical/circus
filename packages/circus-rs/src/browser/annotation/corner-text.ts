import { Annotation } from './annotation';
import { Viewer } from '../viewer/viewer';
import { ViewState } from '../view-state';
import { Sprite } from '../viewer/sprite';

const PADDING = 10;

export class CornerText implements Annotation {
  public draw(viewer: Viewer, viewState: ViewState): Sprite | null {
    if (!viewer || !viewState) return null;
    const canvas = viewer.canvas;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const state = viewer.getState();
    const lines = [JSON.stringify(state.window), JSON.stringify(state.section)];
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

    return null;
  }
}
