import { Box2, Box3, Vector2, Vector3 } from 'three';
import {
  Composition,
  MprImageSource,
  normalVector,
  Section,
  Viewer
} from '../..';
import { dotFromPointToSection } from '../../../common/geometry';
import { getIsoscelesTriangle } from '../../../common/geometry/Triangle';
import { divide, round } from '../../../common/math/FloatingPoint';
import {
  convertPointToMm,
  convertSectionToIndex,
  detectOrthogonalSection,
  OrientationString
} from '../../section-util';
import { getOppositeColor } from './color';
import { drawPolygon, drawRectangle } from './drawObject';

export type Position = 'right' | 'left' | 'top' | 'bottom';
export type Visibility = 'always' | 'hover';

export interface Settings {
  color: string;
  lineWidth: number;
  size: number;
  position: Position;
  marginHorizontal: number;
  marginVertical: number;
  visibility: Visibility;
  visibilityThreshold: number;
}

export interface ScrollbarContainer {
  outerFrameBox: Box2;
  arrowUpBox: Box2;
  arrowDownBox: Box2;
  arrowUpTriangle: Vector2[];
  arrowDownTriangle: Vector2[];
  scrollableBox: Box2;
  thumbBox: Box2;
  thumbScale: number;
  steps: { current: number; end: number };
}

function getOuterFrameBox(resolution: Vector2, settings: Settings): Box2 {
  const { size, position, marginHorizontal, marginVertical } = settings;

  switch (position) {
    case 'top':
      return new Box2(
        new Vector2(0 + marginHorizontal, 0 + marginVertical),
        new Vector2(resolution.x - marginHorizontal, 0 + marginVertical + size)
      );

    case 'bottom':
      return new Box2(
        new Vector2(0 + marginHorizontal, resolution.y - marginVertical - size),
        new Vector2(
          resolution.x - marginHorizontal,
          resolution.y - marginVertical
        )
      );

    case 'left':
      return new Box2(
        new Vector2(0 + marginHorizontal, 0 + marginVertical),
        new Vector2(0 + size + marginHorizontal, resolution.y - marginVertical)
      );

    case 'right':
      return new Box2(
        new Vector2(resolution.x - marginHorizontal - size, 0 + marginVertical),
        new Vector2(
          resolution.x - marginHorizontal,
          resolution.y - marginVertical
        )
      );
  }
}

function getVisibilityThresholdBox(
  resolution: Vector2,
  settings: Settings
): Box2 {
  const {
    marginHorizontal,
    marginVertical,
    visibilityThreshold: distanceThreshold
  } = settings;
  const outerFrameBox = getOuterFrameBox(resolution, settings);
  return outerFrameBox
    .clone()
    .expandByPoint(
      new Vector2(
        Math.max(outerFrameBox.min.x - distanceThreshold, marginHorizontal),
        Math.max(outerFrameBox.min.y - distanceThreshold, marginVertical)
      )
    )
    .expandByPoint(
      new Vector2(
        Math.min(
          outerFrameBox.max.x + distanceThreshold,
          resolution.x - marginHorizontal
        ),
        Math.min(
          outerFrameBox.max.y + distanceThreshold,
          resolution.y - marginVertical
        )
      )
    );
}

function getArrowBox(
  settings: Settings,
  outerFrameBox: Box2,
  isArrowUp: boolean
): Box2 {
  const { size } = settings;
  return isArrowUp
    ? new Box2(
        outerFrameBox.min,
        new Vector2(outerFrameBox.min.x + size, outerFrameBox.min.y + size)
      )
    : new Box2(
        new Vector2(outerFrameBox.max.x - size, outerFrameBox.max.y - size),
        outerFrameBox.max
      );
}

function getArrowTriangle(
  settings: Settings,
  frameBox: Box2,
  isArrowUp: boolean
): Vector2[] {
  const { position, size } = settings;
  const baseLength = size * 0.75;
  const p = (x: number, y: number) => {
    return isArrowUp
      ? frameBox.min.clone().add(new Vector2(x, y))
      : frameBox.max.clone().sub(new Vector2(x, y));
  };
  const apexAngleBisector = () => {
    switch (position) {
      case 'top':
      case 'bottom':
        return {
          from: p(size * 0.2, size * 0.5),
          to: p(size * 0.8, size * 0.5)
        };
      case 'left':
      case 'right':
        return {
          from: p(size * 0.5, size * 0.2),
          to: p(size * 0.5, size * 0.8)
        };
      default:
        throw new Error('Unsupported Scrollbar position');
    }
  };
  return getIsoscelesTriangle(apexAngleBisector(), baseLength);
}

function getSteps(
  mmSection: Section,
  comp: Composition,
  orientation: OrientationString
): { current: number; end: number } {
  const src = comp.imageSource as MprImageSource;
  const voxelCount = new Vector3().fromArray(src.metadata?.voxelCount!);
  const voxelSize = new Vector3().fromArray(src.metadata?.voxelSize!);

  const voxelSteps = () => {
    const indexSection = convertSectionToIndex(mmSection, voxelSize);
    switch (orientation) {
      case 'axial':
        return {
          current: indexSection.origin[2],
          end: voxelCount.z
        };
      case 'coronal':
        return {
          current: indexSection.origin[1],
          end: voxelCount.y
        };
      case 'sagittal':
        return {
          current: indexSection.origin[0],
          end: voxelCount.x
        };
      default:
        throw new Error('Unsupported orientation');
    }
  };

  const mmSteps = () => {
    const mmVolumeBox = new Box3(
      convertPointToMm(new Vector3(0, 0, 0), voxelSize),
      convertPointToMm(voxelCount, voxelSize)
    );
    const nv = normalVector(mmSection).cross(new Vector3());
    const min = mmVolumeBox.min.clone().add(nv);
    const max = mmVolumeBox.max.clone().add(nv);
    const center = mmVolumeBox.getCenter(new Vector3()).add(nv);
    const delta = dotFromPointToSection(mmSection, center);
    const length = min.distanceTo(max);
    return {
      current: delta + divide(length, 2),
      end: length
    };
  };

  switch (orientation) {
    case 'axial':
    case 'coronal':
    case 'sagittal':
      return voxelSteps();
    default:
      return mmSteps();
  }
}

function getThumb(
  settings: Settings,
  scrollableBox: Box2,
  steps: { current: number; end: number }
): { box: Box2; scale: number } {
  const { position, size } = settings;

  const [shortSide, longSide] = [
    scrollableBox.max.x - scrollableBox.min.x,
    scrollableBox.max.y - scrollableBox.min.y
  ].sort((a, b) => a - b);

  const scale = divide(longSide, steps.end);
  const thumbLength = size > scale ? size : scale;
  const thumbScale = divide(longSide - thumbLength, steps.end);

  const min = (() => {
    switch (position) {
      case 'top':
      case 'bottom':
        return new Vector2(
          scrollableBox.min.x + steps.current * thumbScale,
          scrollableBox.min.y
        );
      case 'left':
      case 'right':
        return new Vector2(
          scrollableBox.min.x,
          scrollableBox.min.y + steps.current * thumbScale
        );
      default:
        throw new Error('Unsupported');
    }
  })();

  const max = (() => {
    switch (position) {
      case 'top':
      case 'bottom':
        return new Vector2(min.x + thumbLength, min.y + shortSide);
      case 'left':
      case 'right':
        return new Vector2(min.x + shortSide, min.y + thumbLength);
      default:
        throw new Error('Unsupported');
    }
  })();
  const box = new Box2(min, max);

  return { box, scale };
}

function getScrollbar(
  viewer: Viewer,
  settings: Settings
): ScrollbarContainer | undefined {
  const viewState = viewer.getState();
  if (viewState.type !== 'mpr') return;

  const comp = viewer.getComposition();
  if (!comp) throw new Error('Composition not initialized'); // should not happen

  const section = viewState.section;
  const orientation = detectOrthogonalSection(section);
  const resolution = new Vector2().fromArray(viewer.getResolution());

  const outerFrameBox = getOuterFrameBox(resolution, settings);

  const arrowUpBox = getArrowBox(settings, outerFrameBox, true);
  const arrowUpTriangle = getArrowTriangle(settings, arrowUpBox, true);

  const arrowDownBox = getArrowBox(settings, outerFrameBox, false);
  const arrowDownTriangle = getArrowTriangle(settings, arrowDownBox, false);

  const scrollableBox = new Box2()
    .expandByPoint(arrowUpBox.max)
    .expandByPoint(arrowDownBox.min);

  const steps = getSteps(section, comp, orientation);
  const thumb = getThumb(settings, scrollableBox, steps);

  const scrollbar = {
    outerFrameBox,
    arrowUpBox,
    arrowDownBox,
    arrowUpTriangle,
    arrowDownTriangle,
    scrollableBox,
    thumbBox: thumb.box,
    thumbScale: thumb.scale,
    steps
  };

  return scrollbar;
}

export type HandleType = 'arrowUp' | 'arrowDown' | 'thumbDrag';
export function getHandleType(
  viewer: Viewer,
  point: Vector2,
  settings: Settings
): HandleType | undefined {
  const scrollbar = getScrollbar(viewer, settings);
  if (!scrollbar) return;

  if (scrollbar.arrowUpBox.containsPoint(point)) return 'arrowUp';

  if (scrollbar.arrowDownBox.containsPoint(point)) return 'arrowDown';

  if (scrollbar.thumbBox.containsPoint(point)) return 'thumbDrag';

  return;
}

function isInVisibilityThreshold(
  point: Vector2,
  viewer: Viewer,
  settings: Settings
): boolean {
  const resolution = new Vector2().fromArray(viewer.getResolution());
  const visibilityThresholdBox = getVisibilityThresholdBox(
    resolution,
    settings
  );
  return visibilityThresholdBox.containsPoint(point);
}

export function isVisible(
  point: Vector2,
  viewer: Viewer,
  settings: Settings
): boolean {
  return (
    settings.visibility === 'always' ||
    isInVisibilityThreshold(point, viewer, settings)
  );
}

export function drawVisibilityThresholdBox(viewer: Viewer, settings: Settings) {
  const { lineWidth, color } = settings;
  const canvas = viewer.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const resolution = new Vector2().fromArray(viewer.getResolution());

  const styleFrame = {
    lineWidth: Math.max(1, lineWidth / 2),
    strokeStyle: getOppositeColor(color),
    lineDash: [2, 3]
  };

  drawRectangle(
    ctx,
    getVisibilityThresholdBox(resolution, settings),
    styleFrame
  );
}

export function drawScrollbar(
  viewer: Viewer,
  settings: Settings
): ScrollbarContainer | undefined {
  const { lineWidth, color } = settings;

  const scrollbar = getScrollbar(viewer, settings);
  if (!scrollbar) {
    return;
  }

  const canvas = viewer.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const styleFrame = {
    lineWidth: lineWidth,
    strokeStyle: color
  };
  const styleFill = {
    lineWidth: lineWidth,
    strokeStyle: color,
    fillStyle: color
  };

  try {
    ctx.save();
    drawRectangle(ctx, scrollbar.outerFrameBox, styleFrame);
    drawRectangle(ctx, scrollbar.arrowUpBox, styleFrame);
    drawRectangle(ctx, scrollbar.arrowDownBox, styleFrame);
    drawPolygon(ctx, scrollbar.arrowUpTriangle, styleFill);
    drawPolygon(ctx, scrollbar.arrowDownTriangle, styleFill);
    drawRectangle(ctx, scrollbar.thumbBox, styleFill);
  } finally {
    ctx.restore();
  }
  return scrollbar;
}

export function getStepDifference(
  origin: Vector2,
  point: Vector2,
  settings: Settings,
  scrollbar: ScrollbarContainer | undefined
) {
  const { position } = settings;

  if (!scrollbar) return 0;

  const dist = (() => {
    const v = point.clone().sub(origin);
    switch (position) {
      case 'top':
      case 'bottom':
        return v.x;
      case 'left':
      case 'right':
        return v.y;
    }
  })();
  const step = round(divide(dist, scrollbar.thumbScale), 2);
  return step;
}
