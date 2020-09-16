import { Box2, Box3, Vector2, Vector3 } from 'three';
import {
  Composition,
  MprImageSource,
  normalVector,
  Section,
  Viewer
} from '../..';
import { dotFromPointToSection } from '../../../common/geometry';
import { round } from '../../../common/math/FloatingPoint';
import {
  convertPointToMm,
  convertSectionToIndex,
  detectOrthogonalSection,
  OrientationString
} from '../../section-util';
import { getComplementaryColor } from './color';
import { drawPoint, drawRectangle } from './drawObject';

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
  arrowIncBox: Box2;
  arrowDecBox: Box2;
  scrollableBox: Box2;
  thumbBox: Box2;
  thumbScale: number;
  steps: {
    current: number;
    sumCount: number;
  };
}

export function createScrollbar(
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

  const { size } = settings;

  const outerFrameBox = createOuterFrameBox(resolution, settings);

  const arrowIncBox = new Box2(
    outerFrameBox.min,
    new Vector2(outerFrameBox.min.x + size, outerFrameBox.min.y + size)
  );

  const arrowDecBox = new Box2(
    new Vector2(outerFrameBox.max.x - size, outerFrameBox.max.y - size),
    outerFrameBox.max
  );

  const scrollableBox = new Box2()
    .expandByPoint(arrowIncBox.max)
    .expandByPoint(arrowDecBox.min);

  const steps = calcSteps(section, comp, orientation);
  const thumb = createThumb(settings, scrollableBox, steps);
  const scrollbar = {
    outerFrameBox,
    arrowIncBox,
    arrowDecBox,
    scrollableBox,
    thumbBox: thumb.box,
    thumbScale: thumb.scale,
    steps
  };

  return scrollbar;
}

function createOuterFrameBox(resolution: Vector2, settings: Settings): Box2 {
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

function createVisibilityThresholdBox(
  resolution: Vector2,
  settings: Settings
): Box2 {
  const {
    marginHorizontal,
    marginVertical,
    visibilityThreshold: distanceThreshold
  } = settings;
  const outerFrameBox = createOuterFrameBox(resolution, settings);
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
function createThumb(
  settings: Settings,
  scrollableBox: Box2,
  steps: {
    current: number;
    sumCount: number;
  }
): { box: Box2; scale: number } {
  const { position, size } = settings;

  const scrollableLength = (() => {
    switch (position) {
      case 'top':
      case 'bottom':
        return scrollableBox.max.x - scrollableBox.min.x;

      case 'left':
      case 'right':
        return scrollableBox.max.y - scrollableBox.min.y;
    }
  })();

  const thumbLength = Math.max(size, scrollableLength / (steps.sumCount + 1));
  const thumbScale = (scrollableLength - thumbLength) / steps.sumCount;
  const thumbLocation = round(steps.current, 2) * thumbScale;
  // console.log(JSON.stringify(steps));
  const min = (() => {
    switch (position) {
      case 'top':
      case 'bottom':
        return new Vector2(
          scrollableBox.min.x + thumbLocation,
          scrollableBox.min.y
        );
      case 'left':
      case 'right':
        return new Vector2(
          scrollableBox.min.x,
          scrollableBox.min.y + thumbLocation
        );
      default:
        throw new Error('Unsupported');
    }
  })();

  const max = (() => {
    switch (position) {
      case 'top':
      case 'bottom':
        return new Vector2(min.x + thumbLength, min.y + size);
      case 'left':
      case 'right':
        return new Vector2(min.x + size, min.y + thumbLength);
      default:
        throw new Error('Unsupported');
    }
  })();

  return {
    box: new Box2(min, max),
    scale: thumbScale
  };
}
function calcSteps(
  mmSection: Section,
  comp: Composition,
  orientation: OrientationString
): {
  current: number;
  sumCount: number;
} {
  const src = comp.imageSource as MprImageSource;
  const voxelSize = new Vector3().fromArray(src.metadata?.voxelSize!);

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
      const current = delta + sumCount / 2;

      return {
        current,
        sumCount
      };
    }
  }
}

export type HandleType = 'arrowInc' | 'arrowDec' | 'thumbDrag';
export function handleType(
  viewer: Viewer,
  point: Vector2,
  settings: Settings
): HandleType | undefined {
  const scrollbar = createScrollbar(viewer, settings);
  if (!scrollbar) return;

  if (scrollbar.arrowIncBox.containsPoint(point)) return 'arrowInc';

  if (scrollbar.arrowDecBox.containsPoint(point)) return 'arrowDec';

  if (scrollbar.thumbBox.containsPoint(point)) return 'thumbDrag';

  return;
}

export function isVisible(
  point: Vector2,
  viewer: Viewer,
  settings: Settings
): boolean {
  if (settings.visibility === 'always') return true;
  const resolution = new Vector2().fromArray(viewer.getResolution());
  const visibilityThresholdBox = createVisibilityThresholdBox(
    resolution,
    settings
  );
  return visibilityThresholdBox.containsPoint(point);
}

export function drawVisibilityThresholdBox(viewer: Viewer, settings: Settings) {
  const { lineWidth, color } = settings;
  const canvas = viewer.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const resolution = new Vector2().fromArray(viewer.getResolution());
  const styleFrame = {
    lineWidth: Math.max(1, lineWidth / 2),
    strokeStyle: getComplementaryColor(color),
    lineDash: [2, 3]
  };

  drawRectangle(
    ctx,
    createVisibilityThresholdBox(resolution, settings),
    styleFrame
  );
}

export function drawScrollbar(
  viewer: Viewer,
  settings: Settings
): ScrollbarContainer | undefined {
  const { lineWidth, color, size, position } = settings;

  const scrollbar = createScrollbar(viewer, settings);
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

  const drawArrowTriangle = (box: Box2, isInc: boolean) => {
    const center = box.getCenter(new Vector2());
    const marginX = size * 0.15;
    const marginY = size * 0.2;
    const angle = (() => {
      switch (position) {
        case 'top':
        case 'bottom':
          return (isInc === true ? -1 : 1) * (Math.PI / 180) * 90;
        case 'left':
        case 'right':
          return isInc === true ? 0 : (Math.PI / 180) * 180;
      }
    })();
    ctx.save();
    try {
      ctx.translate(center.x, center.y);
      ctx.rotate(angle);
      ctx.translate(-center.x, -center.y);
      ctx.beginPath();
      ctx.moveTo(box.min.x + size * 0.5, box.min.y + marginY);
      ctx.lineTo(box.max.x - marginX, box.max.y - marginY);
      ctx.lineTo(box.min.x + marginX, box.max.y - marginY);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = styleFill.lineWidth;
      ctx.strokeStyle = styleFill.strokeStyle;
      ctx.stroke();
    } finally {
      ctx.restore();
    }
  };

  try {
    ctx.save();
    drawRectangle(ctx, scrollbar.outerFrameBox, styleFrame);
    drawRectangle(ctx, scrollbar.arrowIncBox, styleFrame);
    drawRectangle(ctx, scrollbar.arrowDecBox, styleFrame);
    drawArrowTriangle(scrollbar.arrowIncBox, true);
    drawArrowTriangle(scrollbar.arrowDecBox, false);
    drawRectangle(ctx, scrollbar.thumbBox, styleFill);
    drawPoint(ctx, scrollbar.thumbBox.getCenter(new Vector2()), {
      color: getComplementaryColor(color),
      radius: 2
    });
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
  const step = round(dist / scrollbar.thumbScale, 2);
  return step;
}
