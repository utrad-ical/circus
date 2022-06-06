import { Box2, Box3, Vector2, Vector3 } from 'three';
import {
  dotFromPointToSection,
  normalVector,
  Section,
  Vector2D
} from '../../../common/geometry';
import Composition from '../../Composition';
import MprImageSource from '../../image-source/MprImageSource';
import TwoDimensionalImageSource from '../../image-source/TwoDimensionalImageSource';
import {
  convertPointToMm,
  convertSectionToIndex,
  detectOrthogonalSection
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewState, { TwoDimensionalViewState } from '../../ViewState';

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

export interface ScrollbarContainer extends ScrollbarBase {
  viewState: ViewState;
  thumbStep: number;
  thumbPosition: number;
}

interface ScrollbarBase {
  resolution: Vector2D;
  scrollbarTranslate: Vector2D;
  scrollbarLength: number;
  scrollableLength: number;
  scrollbarSteps: number;
  thumbLength: number;
  thumbScale: number;
}

export const createScrollbar = (
  viewer: Viewer,
  viewState: ViewState,
  settings: Settings
): ScrollbarContainer => {
  const composition = viewer.getComposition();
  if (!composition) throw new Error('Composition not initialized'); // should not happen
  const resolution = new Vector2().fromArray(viewer.getResolution());

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

  const steps =
    viewState.type === '2d'
      ? calcStepsIn2D(composition, viewState)
      : calcStepsInSection(composition, viewState.section);

  // Provide out of range above and below the scroll bar.
  const scrollbarSteps = steps.sumCount + 2;
  const stateStep = steps.current + 1;

  const thumbLength = Math.max(size, scrollableLength / scrollbarSteps);
  const thumbScale = (scrollableLength - thumbLength) / (scrollbarSteps - 1);

  const scrollbarBase: ScrollbarBase = {
    resolution: [resolution.x, resolution.y],
    scrollbarLength,
    scrollbarTranslate,
    scrollableLength,
    scrollbarSteps,
    thumbLength,
    thumbScale
  };

  const thumbStep = determineThumbStepFromStep(scrollbarBase, stateStep);
  const thumbPosition = thumbStep * thumbScale;

  return { ...scrollbarBase, viewState, thumbStep, thumbPosition };
};

const determineThumbPositionFromPosition = (
  scrollbarBase: ScrollbarBase,
  position: number
): number => {
  const { scrollableLength, thumbLength } = scrollbarBase;
  const thumbPosition = Math.min(
    Math.max(0, position),
    scrollableLength - thumbLength
  );
  return thumbPosition;
};

export const determineThumbStepFromPosition = (
  scrollbarBase: ScrollbarBase,
  position: number
): number => {
  const { thumbScale } = scrollbarBase;
  const thumbPosition = determineThumbPositionFromPosition(
    scrollbarBase,
    position
  );
  const step = thumbPosition / thumbScale;
  return determineThumbStepFromStep(scrollbarBase, step);
};

export const determineThumbStepFromStep = (
  scrollbarBase: ScrollbarBase,
  step: number
): number => {
  const { scrollbarSteps } = scrollbarBase;
  const thumbStep = Math.min(Math.max(step, 0), scrollbarSteps - 1);
  return thumbStep;
};

const calcStepsInSection = (
  composition: Composition,
  mmSection: Section
): { sumCount: number; current: number } => {
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
        sumCount,
        current
      };
    }
  }
};

const calcStepsIn2D = (
  composition: Composition,
  state: TwoDimensionalViewState
): { sumCount: number; current: number } => {
  const src = composition.imageSource as TwoDimensionalImageSource;
  if (!src || !src.metadata || !src.metadata.voxelSize)
    return { current: 0, sumCount: 0 };
  const voxelCount = src.metadata.voxelCount!;
  const current = state.imageNumber;
  const sumCount = voxelCount[2];
  const steps = {
    sumCount,
    current
  };
  return steps;
};

export type HandleType = 'arrowInc' | 'arrowDec' | 'thumbDrag';

export const drawScrollbar = (
  viewer: Viewer,
  settings: Settings,
  scrollbar: ScrollbarContainer
): { judgeHandleType: (p: Vector2) => HandleType | undefined } => {
  const { lineWidth, color, size, position } = settings;
  const { scrollbarTranslate, scrollbarLength, thumbPosition, thumbLength } =
    scrollbar;

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
      if (thumbBoxHitTest(p)) return 'thumbDrag';
      if (arrowIncBoxHitTest(p)) return 'arrowInc';
      if (arrowDecBoxHitTest(p)) return 'arrowDec';
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
