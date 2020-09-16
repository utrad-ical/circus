import { Vector2 } from 'three';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import handlePageBy from '../tool/state/handlePageBy';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import {
  drawScrollbar,
  drawVisibilityThresholdBox,
  handleType,
  getStepDifference,
  HandleType,
  isVisible,
  Position,
  ScrollbarContainer,
  Settings,
  Visibility
} from './helper/getScrollbar';

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
 * Scrollbar is a type of annotation which draws how the sections.
 * It supports paging of stacked images on devices that do not have a mouse (wheel),
 * such as LCD tablets and other touch devices.
 */
export default class Scrollbar implements Annotation, ViewerEventTarget {
  private targetViewer: Viewer;

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

  private visible: boolean;
  private visibilityThreshold: number;
  private handleType: HandleType | undefined;
  private dragStartPoint2: Vector2 | undefined;
  private scrollbar: ScrollbarContainer | undefined;

  private get settings(): Settings {
    return {
      color: this.color,
      lineWidth: this.lineWidth,
      size: this.size,
      position: this.position,
      marginHorizontal: this.marginHorizontal,
      marginVertical: this.marginVertical,
      visibility: this.visibility,
      visibilityThreshold: this.visibilityThreshold
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
    this.handleViewerStateChange = this.handleViewerStateChange.bind(this);
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
      prevState.type !== 'mpr' ||
      state.type !== 'mpr' ||
      prevState.section === state.section
    ) {
      return;
    }
    const viewer = this.targetViewer;
    const comp = viewer.getComposition();
    if (comp) comp.viewers.forEach(v => v !== viewer && v.renderAnnotations());
  }

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (viewer !== this.targetViewer) return;

    const targetState = this.targetViewer.getState();
    if (viewState.type !== 'mpr' || targetState.type !== 'mpr') return;

    if (this.visible) {
      this.scrollbar = drawScrollbar(viewer, this.settings);
    }

    if (this.drawVisibilityThreshold) {
      drawVisibilityThresholdBox(viewer, this.settings);
    }
  }

  /**
   * ViewerEventHandler
   */
  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer !== this.targetViewer) return;

    const point = new Vector2(ev.viewerX!, ev.viewerY!);
    const prevVisible = this.visible;
    this.visible = isVisible(point, viewer, this.settings);

    this.handleType = this.visible
      ? handleType(viewer, point, this.settings)
      : undefined;

    if (this.handleType) {
      viewer.setHoveringAnnotation(this);
      viewer.setCursorStyle('pointer');
      viewer.renderAnnotations();
    } else if (viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
      viewer.renderAnnotations();
    } else if (this.visible !== prevVisible) {
      viewer.renderAnnotations();
    }
  }

  public touchMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer !== this.targetViewer) return;

    const point = new Vector2(ev.viewerX!, ev.viewerY!);
    const prevVisible = this.visible;
    this.visible = isVisible(point, viewer, this.settings);

    this.handleType = this.visible
      ? handleType(viewer, point, this.settings)
      : undefined;

    if (this.handleType) {
      viewer.setHoveringAnnotation(this);
      viewer.setCursorStyle('pointer');
      viewer.renderAnnotations();
    } else if (viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
      viewer.renderAnnotations();
    } else if (this.visible !== prevVisible) {
      viewer.renderAnnotations();
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;
    if (this.visible === false) return;
    if (!this.handleType) return;

    ev.stopPropagation();

    const type = this.handleType;
    if ('thumbDrag' === type) {
      const point = new Vector2(ev.viewerX!, ev.viewerY!);
      this.dragStartPoint2 = point;
    } else if (['arrowInc', 'arrowDec'].some(t => t === type)) {
      const step = type === 'arrowDec' ? 1 : -1;
      const option = ev.original.ctrlKey ? 5 : 1;
      handlePageBy(viewer, step * option);
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer.getHoveringAnnotation() !== this) return;
    if (this.visible === false) return;

    ev.stopPropagation();

    const type = this.handleType;
    if ('thumbDrag' === type) {
      const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const step = getStepDifference(
        this.dragStartPoint2!,
        point,
        this.settings,
        this.scrollbar
      );
      if (step !== 0) {
        this.dragStartPoint2 = point;
        handlePageBy(ev.viewer, step);
      }
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
