import { Vector2 } from 'three';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import { handlePageByScrollbar } from '../tool/state/handlePageBy';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import {
  calcThumbSteps,
  createScrollbar,
  drawScrollbar,
  drawVisibilityThreshold,
  HandleType,
  Position,
  ScrollbarContainer,
  ScrollbarParam,
  Settings,
  updateThumb,
  Visibility
} from './helper/scrollbar';

interface Options {
  color?: string;
  lineWidth?: number;
  size?: number;
  position?: Position;
  marginHorizontal?: number;
  marginVertical?: number;
  visibility?: Visibility;
  visibilityThreshold?: number;
}

/**
 * Scrollbar is a type of annotation which draws a scroll bar on a viewer.
 */
export default class Scrollbar implements Annotation, ViewerEventTarget {
  /**
   * Scrollbar outline width
   */
  public lineWidth: number;

  /**
   * Scrollbar color
   */
  public color: string;

  /**
   * Scrollbar arrow size (square)
   */
  public size: number;

  /**
   * Scrollbar position
   */
  public position: Position;

  /**
   * Margins from the left and right edges of the viewer.
   */
  public marginHorizontal: number;

  /**
   * Margins from the top and bottom edges of the viewer.
   */
  public marginVertical: number;

  /**
   * How to display the scroll bar
   */
  public visibility: Visibility;

  /**
   * For debug,
   */
  public drawVisibilityThreshold: boolean = false;

  private targetViewer: Viewer;
  private visible: boolean;
  private visibilityThreshold: number;
  private handleType: HandleType | undefined;
  private dragStartPoint2: Vector2 | undefined;
  private scrollbar: ScrollbarContainer | undefined;
  private createScrollbar: (
    viewState: ViewState,
    param?: ScrollbarParam
  ) => ScrollbarContainer;
  private judgeHandleType:
    | ((p: Vector2) => HandleType | undefined)
    | undefined = undefined;
  private visibilityThresholdBoxHitTest:
    | ((p: Vector2) => boolean)
    | undefined = undefined;

  private get settings(): Settings {
    return {
      color: this.color,
      lineWidth: this.lineWidth,
      size: this.size,
      position: this.position,
      marginHorizontal: this.marginHorizontal,
      marginVertical: this.marginVertical,
      visibility: this.visibility,
      visibilityThreshold: this.visibilityThreshold,
      drawVisibilityThreshold: this.drawVisibilityThreshold
    };
  }

  public constructor(
    viewer: Viewer,
    {
      color = '#ffffaa',
      lineWidth = 1,
      size = 20,
      position = 'right',
      marginHorizontal = 15,
      marginVertical = 15,
      visibility = 'always',
      visibilityThreshold = 30
    }: Options = {}
  ) {
    if (!(viewer instanceof Viewer)) {
      throw new Error('No viewer specified');
    }

    this.targetViewer = viewer;
    this.color = color;
    this.lineWidth = lineWidth;
    this.size = size;
    this.position = position;
    this.marginHorizontal = marginHorizontal;
    this.marginVertical = marginVertical;
    this.visibility = visibility;
    this.visible = visibility === 'always';
    this.visibilityThreshold = visibilityThreshold;
    this.scrollbar = undefined;

    this.handleViewerStateChange = this.handleViewerStateChange.bind(this);
    viewer.on('stateChange', this.handleViewerStateChange);

    this.createScrollbar = (viewState: ViewState, param?: ScrollbarParam) => {
      return createScrollbar(viewer, viewState, this.settings, param);
    };
  }

  public dispose(): void {
    if (!this.targetViewer) return;

    this.targetViewer.removeListener(
      'stateChange',
      this.handleViewerStateChange
    );
  }

  private handleViewerStateChange(
    prevState: ViewState,
    state: ViewState
  ): void {
    if (
      !prevState ||
      prevState.type !== 'mpr' ||
      state.type !== 'mpr' ||
      prevState.section === state.section
    ) {
      return;
    }
    this.scrollbar = this.createScrollbar(state);
  }

  private handleAnnotationChange(viewer: Viewer): void {
    viewer.renderAnnotations();
    const composition = viewer.getComposition();
    if (!composition) return;
    const viewState = viewer.getState();
    const section = viewState.section;
    const sectionStep = calcThumbSteps(composition, section).thumbStep;
    if (!this.scrollbar)
      this.scrollbar = createScrollbar(viewer, viewState, this.settings);
    const drawnStep = this.scrollbar.thumbStep;
    const stepDiff = drawnStep - sectionStep;
    if (stepDiff != 0) {
      handlePageByScrollbar(viewer, stepDiff);
    }
  }

  public draw(viewer: Viewer, viewState: ViewState, _option: DrawOption): void {
    if (viewer !== this.targetViewer) return;

    const targetState = this.targetViewer.getState();
    if (viewState.type !== 'mpr' || targetState.type !== 'mpr') return;

    this.scrollbar = this.createScrollbar(viewState, this.scrollbar);

    if (this.visible) {
      const { judgeHandleType } = drawScrollbar(
        viewer,
        this.settings,
        this.scrollbar
      );
      this.judgeHandleType = judgeHandleType;
    }

    const { visibilityThresholdBoxHitTest } = drawVisibilityThreshold(
      viewer,
      this.settings,
      this.scrollbar
    );
    this.visibilityThresholdBoxHitTest = visibilityThresholdBoxHitTest;
  }

  /**
   * ViewerEventHandler
   */
  public mouseMoveHandler(ev: ViewerEvent): void {
    this._pointerMoveHandler(ev);
  }

  public touchMoveHandler(ev: ViewerEvent): void {
    this._pointerMoveHandler(ev);
  }

  private _pointerMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer !== this.targetViewer) return;

    const point = new Vector2(ev.viewerX!, ev.viewerY!);
    const prevVisible = this.visible;
    this.visible =
      this.settings.visibility === 'always' ||
      (this.visibilityThresholdBoxHitTest
        ? this.visibilityThresholdBoxHitTest(point)
        : false);

    const prevHandleType = this.handleType;
    if (!this.scrollbar)
      this.scrollbar = this.createScrollbar(viewer.getState());

    this.handleType =
      !this.visible || !this.judgeHandleType
        ? undefined
        : this.judgeHandleType(point);

    if (this.handleType && this.handleType !== prevHandleType) {
      viewer.setHoveringAnnotation(this);
      viewer.setCursorStyle('pointer');
    } else if (!this.handleType && viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
    } else if (this.visible !== prevVisible) {
      viewer.renderAnnotations();
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer !== this.targetViewer) return;

    if (viewer.getHoveringAnnotation() !== this) return;
    if (!this.visible) return;
    if (!this.handleType) return;

    ev.stopPropagation();

    if (!this.scrollbar)
      this.scrollbar = this.createScrollbar(viewer.getState());

    const type = this.handleType;
    if ('thumbDrag' === type) {
      const point = new Vector2(ev.viewerX!, ev.viewerY!);
      this.dragStartPoint2 = point;
    } else if (['arrowInc', 'arrowDec'].some(t => t === type)) {
      const step = type === 'arrowDec' ? 1 : -1;
      const option = ev.original.ctrlKey ? 5 : 1;
      const stepDiff = step * option;
      this.scrollbar = updateThumb(this.scrollbar, 'step-diff', stepDiff);
      this.handleAnnotationChange(viewer);
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer.getHoveringAnnotation() !== this) return;
    if (!this.visible) return;

    ev.stopPropagation();

    if (!this.scrollbar)
      this.scrollbar = this.createScrollbar(viewer.getState());

    if ('thumbDrag' === this.handleType) {
      const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const dist = (() => {
        const v = point.clone().sub(this.dragStartPoint2!);
        switch (this.position) {
          case 'top':
          case 'bottom':
            return v.x;
          case 'left':
          case 'right':
            return v.y;
        }
      })();

      const prevStep = this.scrollbar.thumbStep;
      this.scrollbar = updateThumb(this.scrollbar, 'position-diff', dist);
      const thumbStep = this.scrollbar.thumbStep;
      if (thumbStep != prevStep) this.dragStartPoint2 = point;
      this.handleAnnotationChange(viewer);
    }
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();
      this.dragStartPoint2 = undefined;
    }
  }
}
