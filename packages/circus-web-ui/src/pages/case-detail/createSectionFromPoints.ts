import { Vector3D } from '@utrad-ical/circus-lib/src/generateMhdHeader';
import { getSectionFromPoints } from '@utrad-ical/circus-rs/src/browser/section-util';
import { Section } from '@utrad-ical/circus-rs/src/common/geometry';
import { LayoutInfo, layoutReducer } from 'components/GridContainer';
import * as c from './caseStore';
import { InternalLabelOf } from './labelData';
import { ViewerDef } from './ViewerGrid';

const createSctionFromPoints = (
  points: InternalLabelOf<'point'>[],
  activePointName: string,
  targetSection: Section,
  layout: LayoutInfo,
  layoutItems: ViewerDef[],
  activeSeriesIndex: number
): [ViewerDef[], LayoutInfo, string] => {
  if (activePointName.indexOf('[') < 0) {
    throw new Error(
      'The name of the three point annotations must be suffixed by [1], [2] and [3]'
    );
  }
  const baseName = activePointName.slice(0, activePointName.indexOf('['));

  const targetPoints: Vector3D[] = [];
  for (let i = 1; i <= 3; i++) {
    const labelName = baseName + '[' + i.toString() + ']';
    const num = points.filter(label => {
      return label.name!.indexOf(labelName) === 0;
    }).length;
    if (num === 1) {
      targetPoints.push(
        points.filter(label => {
          return label.name!.indexOf(labelName) === 0;
        })[0].data.location
      );
      continue;
    }
    if (num === 0) {
      throw new Error(`There is no point annotation named "${labelName}"`);
    }
    throw new Error(
      `There are "${num}" point annotations named "${labelName}"`
    );
  }

  const [col, row] = [layout.columns, layout.rows];
  const headerHeight = 28;
  const section = getSectionFromPoints(
    targetPoints,
    targetSection.xAxis,
    layoutItems.length === col * row
      ? targetSection.yAxis.map(n => {
          return (n * col - headerHeight) / (col + 1);
        })
      : targetSection.yAxis
  );

  let newLayout = layout;
  const newLayoutItems: ViewerDef[] = layoutItems.concat();

  const item = c.newViewerCellItem(
    activeSeriesIndex,
    'oblique',
    false,
    section
  );
  newLayoutItems.push(item);
  newLayout = layoutReducer(newLayout, {
    type: 'insertItemToEmptyCell',
    payload: { key: item.key }
  });

  return [newLayoutItems, newLayout, item.key];
};

export default createSctionFromPoints;
