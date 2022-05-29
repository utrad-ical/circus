import { Vector2, Vector3 } from 'three';
import { MprViewState, Viewer } from '../..';
import { intersectionOfTwoSections, Section } from '../../../common/geometry';
import { convertVolumeCoordinateToScreenCoordinate } from '../../section-util';

export interface Line2 {
  start: Vector2;
  end: Vector2;
}

const handleSize = 5;
export interface Settings {
  color: string;
  hover: boolean;
}

export const getReferenceLineOnScreen = (
  screenResolution: Vector2,
  screenSection: Section,
  targetSection: Section
): Line2 | undefined => {
  const refLine = intersectionOfTwoSections(screenSection, targetSection);
  if (!refLine) return;

  const start = convertVolumeCoordinateToScreenCoordinate(
    screenSection,
    screenResolution,
    refLine.start
  );
  const end = convertVolumeCoordinateToScreenCoordinate(
    screenSection,
    screenResolution,
    refLine.end
  );

  return { start, end };
};

export type HandleType = 'move';

export const drawReferenceLine = (
  viewer: Viewer,
  settings: Settings,
  line: Line2
): void => {
  const { color, hover } = settings;
  const { start, end } = line;

  const canvas = viewer.canvas;
  const ctx = canvas.getContext('2d')!;
  try {
    ctx.save();
    ctx.beginPath();
    if (hover) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
    }
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.closePath();
  } finally {
    ctx.restore();
  }
};

export const judgeHandleType = (
  line: Line2,
  point: Vector2
): HandleType | undefined => {
  if (!line) return;
  if (lineHitTest(line, point)) return 'move';
  return;
};

const lineHitTest = (line: Line2, point: Vector2): boolean => {
  const { start, end } = line;
  const delta = new Vector2(end.x - start.x, end.y - start.y);
  const nu = delta.clone().normalize();
  const nv = new Vector2(delta.y, delta.x * -1).normalize();

  const o = start.clone().add(nv.clone().multiplyScalar(-handleSize));
  const p = point.clone().sub(o);
  const pu = p.dot(nu);
  const pv = p.dot(nv);
  const hit =
    pu >= 0 && pv >= 0 && pu <= delta.length() && pv <= handleSize * 2;
  return hit;
};

export const handlePageByReferenceLine = (
  viewer: Viewer,
  moveDistance: Vector3,
  baseState?: MprViewState
): void => {
  if (!baseState) baseState = viewer.getState() as MprViewState;
  const section = baseState.section;

  const cross = new Vector3()
    .crossVectors(
      new Vector3().fromArray(section.xAxis),
      new Vector3().fromArray(section.yAxis)
    )
    .normalize();

  const movedOrigin = new Vector3()
    .fromArray(section.origin)
    .add(cross.multiplyScalar(moveDistance.dot(cross)))
    .toArray();

  const state = {
    ...baseState,
    section: {
      ...section,
      origin: movedOrigin
    }
  };

  viewer.setState(state);
};
