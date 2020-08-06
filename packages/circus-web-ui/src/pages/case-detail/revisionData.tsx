import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Vector2D, Vector3D } from '@utrad-ical/circus-rs/src/browser';
import update from 'immutability-helper';
import { sha1 } from 'utils/util';
import asyncMap from '../../utils/asyncMap';
import { ApiCaller } from 'utils/api';
export interface Revision {
  description: string;
  attributes: any;
  series: SeriesEntry[];
}

export interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
  labels: LabelEntry[];
}

export type LabelType =
  | 'voxel'
  | 'cuboid'
  | 'ellipsoid'
  | 'rectangle'
  | 'ellipse';

export interface LabelEntry {
  temporarykey?: string;
  type: LabelType;
  data: LabelData;
  attributes?: any;
  name?: string;
}

export interface VoxelLabel extends LabelEntry {
  data: VoxelLabelData;
}

export interface SolidFigureLabel extends LabelEntry {
  data: SolidFigureLabelData;
}

export interface PlaneFigureLabel extends LabelEntry {
  data: PlaneFigureLabelData;
}

export interface LabelData {
  color?: string;
  alpha?: number;
}

export interface VoxelLabelData extends LabelData {
  voxels: string | null;
  origin?: Vector3D;
  size?: Vector3D;
  volumeArrayBuffer?: ArrayBuffer;
}

export interface SolidFigureLabelData extends LabelData {
  min: Vector3D;
  max: Vector3D;
}

export interface PlaneFigureLabelData extends LabelData {
  min: Vector2D;
  max: Vector2D;
  z: number;
}

export const createEmptyVoxelLabelData = (): VoxelLabelData => {
  return {
    voxels: null,
    origin: [0, 0, 0],
    size: [16, 16, 16],
    volumeArrayBuffer: new ArrayBuffer((16 * 16 * 16) / 8)
  };
};

export const createDefaultSolidFigureLabelData = (viewers: {
  [index: string]: rs.Viewer;
}): SolidFigureLabelData => {
  const index = Object.keys(viewers).find(
    index =>
      index.includes('axial') ||
      index.includes('sagittal') ||
      index.includes('coronal')
  );
  if (index) {
    const viewer = viewers[index];
    const viewState = viewer.getState();
    return rs.SolidFigure.calculateBoundingBoxWithDefaultDepth(viewer);
  } else {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0]
    };
  }
};

export const createDefaultPlaneFigureLabelData = (viewers: {
  [index: string]: rs.Viewer;
}): PlaneFigureLabelData => {
  const index = Object.keys(viewers).find(index => index.includes('axial'));
  if (index) {
    const viewer = viewers[index];
    return rs.PlaneFigure.calculateBoundingBoxAndDepth(viewer);
  } else {
    return {
      min: [0, 0],
      max: [0, 0],
      z: 0
    };
  }
};

/**
 * Adds temporary label key.
 * Adds actual `volumeArrayBuffer` data to label.data.
 * If label is unpainted, make an empty buffer or an default annotation.
 */
const augumentLabelEntry = async (label: LabelEntry, api: any) => {
  const temporarykey =
    label.temporarykey && label.temporarykey.length > 0
      ? label.temporarykey
      : generateUniqueId();

  if (label.type === 'voxel') {
    const voxelLabel = label as VoxelLabel;
    if (voxelLabel.data.voxels) {
      const volumeArrayBuffer = await api(`blob/${voxelLabel.data.voxels}`, {
        responseType: 'arraybuffer'
      });
      return update(voxelLabel, {
        temporarykey: { $set: temporarykey },
        data: { $merge: { volumeArrayBuffer } }
      });
    } else {
      // Empty label
      return update(voxelLabel, {
        temporarykey: { $set: temporarykey },
        data: { $merge: createEmptyVoxelLabelData() }
      });
    }
  } else {
    return update(label, {
      temporarykey: { $set: temporarykey }
    });
  }
};

/**
 * Adds temporary label key
 * and asynchronously loads voxel data from API
 * and assigns it to the given label cache.
 */
export const loadLabels = async (revision: Revision, api: any) => {
  return update(revision, {
    series: {
      $set: await asyncMap(revision.series, async series => {
        return update(series, {
          labels: {
            $set: await asyncMap(series.labels, label =>
              augumentLabelEntry(label, api)
            )
          }
        });
      })
    }
  });
};

export const voxelShrinkToMinimum = (data: {
  origin?: Vector3D;
  size?: Vector3D;
  volumeArrayBuffer?: ArrayBuffer;
}) => {
  if (!data.origin || !data.size || !data.volumeArrayBuffer) return null;
  const volume = new rs.RawData(data.size, 'binary');
  volume.assign(data.volumeArrayBuffer);
  const cloud = new rs.VoxelCloud(); // temporary
  cloud.origin = [...data.origin];
  cloud.volume = volume;
  const isNotEmpty = cloud.shrinkToMinimum();
  return isNotEmpty ? { origin: cloud.origin, rawData: cloud.volume } : null;
};

const prepareLabelSaveData = async (
  label: LabelEntry,
  api: ApiCaller
): Promise<LabelEntry> => {
  switch (label.type) {
    case 'voxel':
      return prepareLabelSaveDataOfVoxel(label as VoxelLabel, api);
    case 'cuboid':
    case 'ellipsoid':
      return prepareLabelSaveDataOfSolidFigure(label as SolidFigureLabel, api);
    case 'rectangle':
    case 'ellipse':
      return prepareLabelSaveDataOfPlaneFigure(label as PlaneFigureLabel, api);
    default:
      return label;
  }
};

const prepareLabelSaveDataOfVoxel = async (
  label: VoxelLabel,
  api: ApiCaller
): Promise<VoxelLabel> => {
  if (label.type !== 'voxel') return label;
  const shrinkResult = voxelShrinkToMinimum(label.data);
  const newLabel = {
    type: label.type,
    name: label.name,
    data: {
      color: label.data.color,
      alpha: label.data.alpha,
      voxels: null
    }
  };
  if (shrinkResult !== null) {
    // There are painted voxels
    const { origin, rawData } = shrinkResult;
    const voxels = sha1(rawData.data);
    if (voxels === label.data.voxels) {
      // Skipping unchanged label data
    } else {
      await api('blob/' + voxels, {
        method: 'put',
        handleErrors: true,
        data: rawData.data,
        headers: { 'Content-Type': 'application/octet-stream' }
      });
    }
    Object.assign(newLabel.data, {
      voxels,
      origin,
      size: rawData.getDimension()
    });
  }
  return newLabel;
};

const prepareLabelSaveDataOfSolidFigure = async (
  label: SolidFigureLabel,
  api: ApiCaller
): Promise<SolidFigureLabel> => {
  if (label.type !== 'cuboid' && label.type !== 'ellipsoid') return label;
  const newLabel = {
    type: label.type,
    name: label.name,
    data: {
      color: label.data.color,
      alpha: label.data.alpha,
      min: label.data.min,
      max: label.data.max
    }
  };
  return newLabel;
};

const prepareLabelSaveDataOfPlaneFigure = async (
  label: PlaneFigureLabel,
  api: ApiCaller
): Promise<PlaneFigureLabel> => {
  if (label.type !== 'rectangle' && label.type !== 'ellipse') return label;
  const newLabel = {
    type: label.type,
    name: label.name,
    data: {
      color: label.data.color,
      alpha: label.data.alpha,
      min: label.data.min,
      max: label.data.max,
      z: label.data.z
    }
  };
  return newLabel;
};

const prepareSeriesSaveData = async (series: SeriesEntry, api: any) => {
  return update(series, {
    labels: {
      $set: await asyncMap(series.labels, async label =>
        prepareLabelSaveData(label, api)
      )
    }
  });
};

/**
 * Saves a new revision data on the API server.
 */
export const saveRevision = async (
  caseId: string,
  revision: Revision,
  description: string,
  api: ApiCaller
) => {
  const saveData = {
    description,
    attributes: revision.attributes,
    status: 'approved',
    series: await asyncMap(revision.series, async series =>
      prepareSeriesSaveData(series, api)
    )
  };

  await api(`cases/${caseId}/revision`, {
    method: 'post',
    data: saveData
  });
};
