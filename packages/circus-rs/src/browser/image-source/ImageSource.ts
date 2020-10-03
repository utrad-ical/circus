import { EventEmitter } from 'events';
import ViewState from '../ViewState';
import Viewer from '../viewer/Viewer';
import { Vector2D } from '../../common/geometry';

export type ViewStateResizeTransformer = (
  viewState: ViewState,
  beforeSize: Vector2D,
  afterSize: Vector2D
) => ViewState;

export type DrawResult =
  | ImageData
  | { draft: ImageData; next: Promise<DrawResult> };

/**
 * ImageSource is an abstract class which represents a
 * 2D or 3D image from any source and draws it onto a given canvas.
 */
export default abstract class ImageSource extends EventEmitter {
  /**
   * Draws an image according to the current view state.
   * @param viewer The Viewer.
   * @param viewState The view state.
   * @param abortSignal Used to cancel this draw.
   *   A draw will not be aborted until the initial DrawReslut,
   *   but it may be aborted after a draft was returned.
   *   Thus this signal can be safely ignored if an implementation of `draw()`
   *   does not return any draft.
   * @returns The final image as an ImageData, or a draft image.
   */
  public abstract draw(
    viewer: Viewer,
    viewState: ViewState,
    abortSignal: AbortSignal
  ): Promise<DrawResult>;

  /**
   * Returns a Promise instance which resolves when
   * preparation task is finished and draw() can be called.
   */
  public ready(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Creates the default view state object which will be used
   * when the image is firstly loaded to a viewer.
   */
  public abstract initialState(viewer: Viewer): ViewState;

  public getResizeTransformer(): ViewStateResizeTransformer {
    return v => v;
  }
}
