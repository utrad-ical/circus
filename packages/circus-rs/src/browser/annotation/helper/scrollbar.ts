import { Box2, Box3, Vector2, Vector3 } from 'three';
import {
  Composition,
  MprImageSource,
  normalVector,
  Viewer,
  ViewState
} from '../..';
import {
  dotFromPointToSection,
  Section,
  Vector2D
} from '../../../common/geometry';
import {
  convertPointToMm,
  convertSectionToIndex,
  detectOrthogonalSection
} from '../../section-util';

export type Position = 'right' | 'left' | 'top' | 'bottom';
export type Visibility = 'always' | 'hover';
type xywh = [number, number, number, number];
export interface Settings {
  color: string;
  lineWidth: number;
  size: number;
  position: Position;
  marginHorizontal: number;
  marginVertical: number;
  visibility: Visibility;
  visibilityThreshold: number;
  drawVisibilityThreshold: boolean;
}

export interface ScrollbarContainer extends ScrollbarBase, ScrollbarThumb {}

interface ScrollbarBase {
  scrollbarTranslate: Vector2D;
  scrollbarLength: number;
  scrollableLength: number;
  thumbLength: number;
  thumbScale: number;
}

interface ScrollbarThumb {
  thumbStep: number;
  thumbPosition: number;
}

const updateThumbByPosition = (
  scrollbarBase: ScrollbarBase,
  thumbPosition: number
): ScrollbarContainer => {
  const { scrollableLength, thumbLength, thumbScale } = scrollbarBase;

  thumbPosition = Math.min(
    Math.max(0, thumbPosition),
    scrollableLength - thumbLength
  );

  const thumbStep = thumbPosition / thumbScale;

  return { ...scrollbarBase, thumbPosition, thumbStep };
};

export type UpdateThumbParamType = 'position-diff' | 'step-diff';

export const updateThumb = (
  scrollbar: ScrollbarContainer,
  paramType: UpdateThumbParamType,
  param: number | { composition: Composition; mmSection: Section }
): ScrollbarContainer => {
  if (typeof param === 'number') {
    switch (paramType) {
      case 'position-diff': {
        const thumbPosition = scrollbar.thumbPosition + param;
        return updateThumbByPosition(scrollbar, thumbPosition);
      }
      case 'step-diff': {
        const thumbPosition =
          (scrollbar.thumbStep + param) * scrollbar.thumbScale;
        return updateThumbByPosition(scrollbar, thumbPosition);
      }
      default:
        break;
    }
  }
  throw new Error('invalid parameter');
};

export const createScrollbar = (
  viewer: Viewer,
  viewState: ViewState,
  settings: Settings
): ScrollbarContainer => {
  const composition = viewer.getComposition();
  if (!composition) throw new Error('Composition not initialized'); // should not happen
  const resolution = new Vector2().fromArray(viewer.getResolution());

  const mmSection = viewState.section;

  const { size, position, marginHorizontal, marginVertical } = settings;

  const scrollbarLength = (() => {
    switch (position) {
      case 'top':
      case 'bottom':
        return resolution.x - marginHorizontal * 2;
      case 'left':
      case 'right':
        return resolution.y - marginVertical * 2;
    }
  })();

  const scrollbarTranslate = ((): Vector2D => {
    switch (position) {
      case 'top':
        return [0 + marginHorizontal, 0 + marginVertical];
      case 'bottom':
        return [0 + marginHorizontal, resolution.y - marginVertical - size];
      case 'left':
        return [0 + marginHorizontal, 0 + marginVertical];
      case 'right':
        return [resolution.x - marginHorizontal - size, 0 + marginVertical];
    }
  })();

  const scrollableLength = scrollbarLength - size * 2;

  const { thumbStep, divideCount } = calcThumbSteps(composition, mmSection);
  const thumbLength = Math.max(size, scrollableLength / divideCount);
  const thumbScale = (scrollableLength - thumbLength) / (divideCount - 1);
  const thumbPosition = thumbStep * thumbScale;
  const scrollbarBase: ScrollbarBase = {
    scrollbarTranslate,
    scrollbarLength,
    scrollableLength,
    thumbLength,
    thumbScale
  };
  return updateThumbByPosition(scrollbarBase, thumbPosition);
};

export const calcThumbSteps = (
  composition: Composition,
  mmSection: Section
): { thumbStep: number; divideCount: number } => {
  const steps = calcSectionSteps(composition, mmSection);
  return { thumbStep: steps.current + 1, divideCount: steps.sumCount + 2 };
};

const calcSectionSteps = (
  composition: Composition,
  mmSection: Section
): { current: number; sumCount: number } => {
  const orientation = detectOrthogonalSection(mmSection);

  const src = composition.imageSource as MprImageSource;
  if (!src || !src.metadata || !src.metadata.voxelSize)
    return { current: 0, sumCount: 0 };

  const voxelSize = new Vector3().fromArray(src.metadata!.voxelSize!);

  switch (orientation) {
    case 'axial':
    case 'coronal':
    case 'sagittal': {
      const voxelCount = src.metadata?.voxelCount!;
      const indexSection = convertSectionToIndex(mmSection, voxelSize);
      const i = orientation === 'axial' ? 2 : orientation === 'coronal' ? 1 : 0;
      const current = indexSection.origin[i];
      const sumCount = voxelCount[i];
      const steps = {
        current,
        sumCount
      };
      return steps;
    }
    default: {
      const voxelCount = new Vector3().fromArray(src.metadata?.voxelCount!);
      const mmVolumeBox = new Box3(
        convertPointToMm(new Vector3(0, 0, 0), voxelSize),
        convertPointToMm(voxelCount, voxelSize)
      );
      const nv = normalVector(mmSection).cross(new Vector3());
      const min = mmVolumeBox.min.clone().add(nv);
      const max = mmVolumeBox.max.clone().add(nv);
      const center = mmVolumeBox.getCenter(new Vector3()).add(nv);
      const delta = dotFromPointToSection(mmSection, center);
      const sumCount = min.distanceTo(max);
      const current = sumCount / 2 - delta;

      return {
        current,
        sumCount
      };
    }
  }
};

export type HandleType = 'arrowInc' | 'arrowDec' | 'thumbDrag';

export const drawScrollbar = (
  viewer: Viewer,
  settings: Settings,
  scrollbar: ScrollbarContainer
): { judgeHandleType: (p: Vector2) => HandleType | undefined } => {
  const { lineWidth, color, size, position } = settings;
  const {
    scrollbarTranslate,
    scrollbarLength,
    thumbPosition,
    thumbLength
  } = scrollbar;

  const canvas = viewer.canvas;

  const ctx = canvas.getContext('2d')!;

  const drawArrowTriangle = (isInc: boolean) => {
    const center = size * 0.5;
    const marginX = size * 0.15;
    const marginY = size * 0.2;
    const angle = (isInc ? -1 : 1) * (Math.PI / 180) * 90;
    ctx.save();
    try {
      if (!isInc) ctx.translate(scrollbarLength - size, 0);
      ctx.translate(center, center);
      ctx.rotate(angle);
      ctx.translate(-center, -center);
      ctx.beginPath();
      ctx.moveTo(0 + size * 0.5, 0 + marginY);
      ctx.lineTo(size - marginX, size - marginY);
      ctx.lineTo(0 + marginX, size - marginY);
      ctx.closePath();
      ctx.fill();
    } finally {
      ctx.restore();
    }
  };

  const xywhThumb: xywh = [thumbPosition + size, 0, thumbLength, size];
  const xywhFrame: xywh = [0, 0, scrollbarLength, size];
  const xywhArrowInc: xywh = [0, 0, size, size];
  const xywhArrowDec: xywh = [scrollbarLength - size, 0, size, size];

  ctx.save();
  try {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.translate(...scrollbarTranslate);
    if (position === 'right' || position === 'left') {
      ctx.translate(size, 0);
      ctx.rotate((Math.PI / 180) * 90);
    }
    drawArrowTriangle(true);
    drawArrowTriangle(false);
    ctx.beginPath();
    ctx.rect(...xywhFrame);
    ctx.rect(...xywhArrowInc);
    ctx.rect(...xywhArrowDec);
    ctx.fillRect(...xywhThumb);
    ctx.closePath();
    ctx.stroke();

    const matrix = ctx.getTransform();
    const thumbBoxHitTest = (p: Vector2) => {
      return containsPoint(p, matrix, xywhThumb);
    };

    const arrowIncBoxHitTest = (p: Vector2) => {
      return containsPoint(p, matrix, xywhArrowInc);
    };

    const arrowDecBoxHitTest = (p: Vector2) => {
      return containsPoint(p, matrix, xywhArrowDec);
    };

    const judgeHandleType = (p: Vector2): HandleType | undefined => {
      if (thumbBoxHitTest && thumbBoxHitTest(p)) return 'thumbDrag';
      if (arrowIncBoxHitTest && arrowIncBoxHitTest(p)) return 'arrowInc';
      if (arrowDecBoxHitTest && arrowDecBoxHitTest(p)) return 'arrowDec';
      return undefined;
    };
    return { judgeHandleType };
  } finally {
    ctx.restore();
  }
};

export const drawVisibilityThreshold = (
  viewer: Viewer,
  settings: Settings,
  scrollbar: ScrollbarContainer
): {
  visibilityThresholdBoxHitTest: (p: Vector2) => boolean;
} => {
  const {
    drawVisibilityThreshold,
    lineWidth,
    color,
    size,
    position,
    visibilityThreshold
  } = settings;
  const { scrollbarTranslate, scrollbarLength } = scrollbar;

  const xywhVisibilityThresholdBox = ((): xywh => {
    if (position === 'top' || position === 'right') {
      return [0, 0, scrollbarLength, size + visibilityThreshold];
    } else {
      return [0, size, scrollbarLength, -(size + visibilityThreshold)];
    }
  })();

  const canvas = viewer.canvas;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  try {
    ctx.translate(...scrollbarTranslate);
    if (position === 'right' || position === 'left') {
      ctx.translate(size, 0);
      ctx.rotate((Math.PI / 180) * 90);
    }
    if (drawVisibilityThreshold) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.rect(...xywhVisibilityThresholdBox);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const matrix = ctx.getTransform();
    const visibilityThresholdBoxHitTest = (p: Vector2) => {
      return containsPoint(p, matrix, xywhVisibilityThresholdBox);
    };
    return { visibilityThresholdBoxHitTest };
  } finally {
    ctx.restore();
  }
};

const calcTransformedPoint = (matrix: DOMMatrix) => {
  return (p: { x: number; y: number }) => {
    const x = matrix.a * p.x + matrix.c * p.y + matrix.e;
    const y = matrix.b * p.x + matrix.d * p.y + matrix.f;
    return new Vector2(x, y);
  };
};

const containsPoint = (
  point: Vector2,
  matrix: DOMMatrix,
  [x, y, w, h]: xywh
): boolean => {
  const transformedPoint = calcTransformedPoint(matrix);
  const p1 = transformedPoint({ x, y });
  const p2 = transformedPoint({ x: x + w, y: y + h });
  const box = new Box2().expandByPoint(p1).expandByPoint(p2);
  return box.containsPoint(point);
};
