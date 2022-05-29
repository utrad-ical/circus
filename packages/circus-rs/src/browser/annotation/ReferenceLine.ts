import { Vector2, Vector3 } from 'three';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import { convertScreenCoordinateToVolumeCoordinate } from '../section-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import {
  drawReferenceLine,
  getReferenceLineOnScreen,
  handlePageByReferenceLine,
  HandleType,
  judgeHandleType,
  Line2
} from './helper/referenceLine';

interface Options {
  color?: string;
}

const isValidViewState = (
  viewState: ViewState | undefined
): viewState is MprViewState => {
  if (!viewState) return false;
  if (viewState.type === 'mpr') return true;
  return false;
};

/**
 * ReferenceLine is a type of annotation which draws how the sections
 * of other viewers which share the same composition intersect with this viewer.
 */
export default class ReferenceLine implements Annotation, ViewerEventTarget {
  private targetViewer: Viewer;

  /**
   * Color of the reference line.
   */
  public color: string;
  private handleType: HandleType | undefined = undefined;
  private dragStartPoint3: Vector3 | undefined = undefined;
  private dragStartTargetState: MprViewState | undefined = undefined;
  public id?: string;

  public constructor(viewer: Viewer, { color = '#ff00ff' }: Options = {}) {
    if (!(viewer instanceof Viewer)) {
      throw new Error('No viewer specified');
    }
    this.targetViewer = viewer;
    this.color = color;
    this.handleViewerStateChange = this.handleViewerStateChange.bind(this);
    this.getReferenceLineOnScreen = this.getReferenceLineOnScreen.bind(this);
    viewer.on('stateChange', this.handleViewerStateChange);
  }

  public dispose(): void {
    if (this.targetViewer) {
      this.targetViewer.removeListener(
        'stateChange',
        this.handleViewerStateChange
      );
    }
  }

  private handleViewerStateChange(
    prevState: ViewState,
    state: ViewState
  ): void {
    if (
      !isValidViewState(prevState) ||
      !isValidViewState(state) ||
      prevState.section === state.section
    )
      return;

    const targetViewer = this.targetViewer;
    const composition = targetViewer.getComposition();
    if (!composition) return;
    const viewers = composition.viewers.filter(v => v !== targetViewer);
    composition.annotationUpdated(viewers);
  }

  private getReferenceLineOnScreen(
    screenViewer: Viewer,
    screenState?: ViewState
  ): Line2 | undefined {
    const screenResolution = new Vector2().fromArray(
      screenViewer.getResolution()
    );
    if (!screenState) screenState = screenViewer.getState();

    const targetState = (() => {
      try {
        return this.targetViewer.getState(); // this may be uninitialized
      } catch (err) {
        return undefined;
      }
    })();

    if (!isValidViewState(screenState) || !isValidViewState(targetState))
      return;
    return getReferenceLineOnScreen(
      screenResolution,
      screenState.section,
      targetState.section
    );
  }

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (viewer === this.targetViewer) return;

    const requestingViewState = option.requestingViewState ?? viewState;
    const line = this.getReferenceLineOnScreen(viewer, requestingViewState);
    if (!line) return;

    if (line) {
      const settings = { color: this.color, hover: option.hover };
      drawReferenceLine(viewer, settings, line);
    }
  }

  /**
   * ViewerEventHandler
   */
  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer === this.targetViewer) return;

    const line = this.getReferenceLineOnScreen(viewer);
    if (!line) return;

    const point = new Vector2(ev.viewerX!, ev.viewerY!);
    this.handleType = judgeHandleType(line, point);

    if (this.handleType) {
      ev.stopPropagation();
      viewer.setHoveringAnnotation(this);
      viewer.setCursorStyle('move');
      viewer.renderAnnotations();
    } else if (viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
      viewer.renderAnnotations();
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;
    if (!this.handleType) return;

    ev.stopPropagation();

    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
    const state = viewer.getState() as MprViewState;
    const resolution: [number, number] = viewer.getResolution();

    this.dragStartPoint3 = convertScreenCoordinateToVolumeCoordinate(
      state.section,
      new Vector2().fromArray(resolution),
      new Vector2().fromArray([point.x, point.y])
    );
    this.dragStartTargetState = this.targetViewer.getState() as MprViewState;
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer.getHoveringAnnotation() !== this) return;
    if (!this.handleType) return;
    if (!this.dragStartPoint3 || !this.dragStartTargetState) return;

    ev.stopPropagation();

    const dragPoint3 = ((): Vector3 => {
      const resolution = viewer.getResolution();
      const screenState = viewer.getState() as MprViewState;
      const point = convertScreenCoordinateToVolumeCoordinate(
        screenState.section,
        new Vector2().fromArray(resolution),
        new Vector2(ev.viewerX!, ev.viewerY!)
      );
      return point;
    })();

    const dragDistance = dragPoint3.clone().sub(this.dragStartPoint3);

    if (this.handleType === 'move') {
      handlePageByReferenceLine(
        this.targetViewer,
        dragDistance,
        this.dragStartTargetState
      );
    }
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    ev.stopPropagation();

    this.dragStartPoint3 = undefined;
    this.dragStartTargetState = undefined;
  }
}
