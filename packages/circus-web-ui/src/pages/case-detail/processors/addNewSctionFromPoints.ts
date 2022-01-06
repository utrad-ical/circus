import { Vector3D } from '@utrad-ical/circus-lib/src/generateMhdHeader';
import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import { DicomVolumeMetadata } from '@utrad-ical/circus-rs/src/browser/image-source/volume-loader/DicomVolumeLoader';
import { getSectionFromPoints } from '@utrad-ical/circus-rs/src/browser/section-util';
import { Section } from '@utrad-ical/circus-rs/src/common/geometry';
import { LayoutInfo, layoutReducer } from 'components/GridContainer';
import * as c from '../caseStore';
import { InternalLabelOf } from '../labelData';
import { EditingData, EditingDataUpdater } from '../revisionData';
import { ViewerDef } from '../ViewerGrid';

const createSectionFromPoints = (
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
    '3d',
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

export type NewSctionFromPointsOptions = {
  editingData: EditingData;
  updateEditingData: EditingDataUpdater;
  metadata: (DicomVolumeMetadata | undefined)[];
  viewers: { [index: string]: Viewer };
};

const addNewSctionFromPoints = (options: NewSctionFromPointsOptions) => {
  const { editingData, updateEditingData, metadata, viewers } = options;
  return () => {
    try {
      const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
      const activeSeriesMetadata = metadata[activeSeriesIndex];
      const activeSeries = revision.series[activeSeriesIndex];
      const activeLabel =
        activeLabelIndex >= 0 ? activeSeries.labels[activeLabelIndex] : null;
      const seriesIndex = Number(
        Object.keys(editingData.revision.series).find(ind =>
          editingData.revision.series[Number(ind)].labels.find(
            item => item.temporaryKey === activeLabel!.temporaryKey
          )
        )
      );
      const spareKey = Object.keys(editingData.layout.positions).find(
        key =>
          editingData.layoutItems.find(item => item.key === key)!
            .seriesIndex === seriesIndex
      );
      const useActiveLayoutKey = Object.keys(editingData.layout.positions)
        .filter(
          key =>
            editingData.layoutItems.find(item => item.key === key)!
              .seriesIndex === seriesIndex
        )
        .some(key => key === editingData.activeLayoutKey);
      const targetLayoutKey = useActiveLayoutKey
        ? editingData.activeLayoutKey
        : spareKey;
      const [newLayoutItems, newLayout, key] = createSectionFromPoints(
        editingData.revision.series[activeSeriesIndex].labels.filter(label => {
          return (
            label.type === 'point' && !(activeSeriesMetadata?.mode !== '3d')
          );
        }) as InternalLabelOf<'point'>[],
        activeLabel!.name!,
        (viewers[targetLayoutKey!].getState() as any).section,
        editingData.layout,
        editingData.layoutItems,
        activeSeriesIndex
      );
      updateEditingData((d: EditingData) => {
        d.layoutItems = newLayoutItems;
        d.layout = newLayout;
        d.activeLayoutKey = key;
      });
    } catch (err: any) {
      alert(err.message);
    }
  };
};

export default addNewSctionFromPoints;
