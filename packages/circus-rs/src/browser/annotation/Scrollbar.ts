import { Vector2 } from 'three';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import { handlePageByScrollbar } from '../tool/state/handlePageBy';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState, TwoDimensionalViewState } from '../ViewState';
import Annotation, { DrawHints } from './Annotation';
import {
  createScrollbar,
  determineThumbStepFromPosition,
  determineThumbStepFromStep,
  drawScrollbar,
  drawVisibilityThreshold,
  HandleType,
  Position,
  ScrollbarContainer,
  Settings,
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

const isValidViewState = (
  viewState: ViewState | undefined
): viewState is MprViewState | TwoDimensionalViewState => {
  if (!viewState) return false;
  if (viewState.type === 'mpr') return true;
  if (viewState.type === '2d') return true;
  return false;
};

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
   * For debugging,
   */
  public drawVisibilityThreshold: boolean = false;

  private targetViewer: Viewer;
  private visible: boolean;
  private visibilityThreshold: number;
  private handleType: HandleType | undefined;
  private dragStartScrollbar: ScrollbarContainer | undefined;
  private dragStartPoint2: Vector2 | undefined;
  private scrollbar: ScrollbarContainer | undefined;
  private createScrollbar: (
    requestingViewState: ViewState
  ) => ScrollbarContainer;
  private determineHandleType:
    | ((p: Vector2) => HandleType | undefined)
    | undefined = undefined;
  private visibilityThresholdBoxHitTest: ((p: Vector2) => boolean) | undefined =
    undefined;

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

    this.createScrollbar = (requestingViewState: ViewState) => {
      return createScrollbar(viewer, requestingViewState, this.settings);
    };
  }

  private handleAnnotationChange(baseState: ViewState, step: number): void {
    const viewer = this.targetViewer;
    handlePageByScrollbar(viewer, step, baseState);
  }

  public draw(viewer: Viewer, viewState: ViewState, hints: DrawHints): void {
    if (viewer !== this.targetViewer) return;

    const requestingViewState = hints.requestingViewState || viewState;
    if (!isValidViewState(requestingViewState)) return;

    const resolution = viewer.getResolution();
    if (
      !this.scrollbar ||
      this.scrollbar.viewState !== requestingViewState ||
      this.scrollbar.resolution[0] != resolution[0] ||
      this.scrollbar.resolution[1] != resolution[1]
    ) {
      this.scrollbar = this.createScrollbar(requestingViewState);
    }

    if (this.visible) {
      const { determineHandleType } = drawScrollbar(
        viewer,
        this.settings,
        this.scrollbar
      );
      this.determineHandleType = determineHandleType;
    } else {
      this.determineHandleType = undefined;
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
    const viewer = ev.viewer;
    if (viewer !== this.targetViewer) return;

    const point = new Vector2(ev.viewerX!, ev.viewerY!);

    const prevVisible = this.visible;
    this.visible =
      this.settings.visibility === 'always' ||
      (this.visibilityThresholdBoxHitTest
        ? this.visibilityThresholdBoxHitTest(point)
        : false);

    this.handleType =
      !this.visible || !this.determineHandleType
        ? undefined
        : this.determineHandleType(point);

    if (this.handleType) {
      ev.stopPropagation();
      viewer.setHoveringAnnotation(this);
      viewer.setCursorStyle('pointer');
    } else if (viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
    }

    if (this.handleType || this.visible !== prevVisible) {
      viewer.renderAnnotations();
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer !== this.targetViewer) return;
    if (viewer.getHoveringAnnotation() !== this) return;
    if (!this.visible) return;
    if (!this.handleType) return;
    if (!this.scrollbar) return;

    ev.stopPropagation();

    const type = this.handleType;
    if ('thumbDrag' === type) {
      const point = new Vector2(ev.viewerX!, ev.viewerY!);
      this.dragStartScrollbar = { ...this.scrollbar };
      this.dragStartPoint2 = point;
    } else if (['arrowInc', 'arrowDec'].some(t => t === type)) {
      const direction = type === 'arrowDec' ? 1 : -1;
      const parameter = ev.original.ctrlKey ? 5 : 1;
      const requestingThumbStep = Math.round(
        determineThumbStepFromStep(
          this.scrollbar,
          this.scrollbar.thumbStep + direction * parameter
        )
      );
      this.handleAnnotationChange(
        this.scrollbar.viewState,
        requestingThumbStep - this.scrollbar.thumbStep
      );
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer !== this.targetViewer) return;
    if (viewer.getHoveringAnnotation() !== this) return;
    if (!this.visible) return;
    if (!this.handleType) return;
    if (!this.scrollbar) return;
    if (!this.dragStartScrollbar || !this.dragStartPoint2) return;

    ev.stopPropagation();

    if ('thumbDrag' === this.handleType) {
      const composition = viewer.getComposition();
      if (!composition) return;

      const dragDistance = (() => {
        const dragPoint2 = new Vector2(ev.viewerX!, ev.viewerY!);
        const diff = dragPoint2.clone().sub(this.dragStartPoint2);
        switch (this.position) {
          case 'top':
          case 'bottom':
            return diff.x;
          case 'left':
          case 'right':
            return diff.y;
        }
      })();

      const requestingThumbPosition =
        this.dragStartScrollbar.thumbPosition + dragDistance;
      if (requestingThumbPosition === this.scrollbar.thumbPosition) return;

      const requestingThumbStep = determineThumbStepFromPosition(
        this.dragStartScrollbar,
        requestingThumbPosition
      );
      this.handleAnnotationChange(
        this.dragStartScrollbar.viewState,
        requestingThumbStep - this.dragStartScrollbar.thumbStep
      );
    }
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer !== this.targetViewer) return;
    if (viewer.getHoveringAnnotation() !== this) return;
    ev.stopPropagation();
    this.dragStartScrollbar = undefined;
    this.dragStartPoint2 = undefined;
  }
}
