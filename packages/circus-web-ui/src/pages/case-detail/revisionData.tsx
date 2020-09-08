import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Vector2D, Vector3D } from '@utrad-ical/circus-rs/src/browser';
import produce, { Draft } from 'immer';
import { sha1 } from 'utils/util';
import asyncMap from '../../utils/asyncMap';
import { ApiCaller } from 'utils/api';

export interface EditingData {
  revision: Revision;
  activeSeriesIndex: number;
  activeLabelIndex: number;
}

export interface Revision<
  L extends InternalLabel | ExternalLabel = InternalLabel
> {
  description: string;
  attributes: any;
  series: SeriesEntry<L>[];
}

export interface SeriesEntry<
  L extends InternalLabel | ExternalLabel = InternalLabel
> {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
  labels: L[];
}

export type LabelType =
  | 'voxel'
  | 'cuboid'
  | 'ellipsoid'
  | 'rectangle'
  | 'ellipse';

interface InternalVoxelLabelData {
  /**
   * Contains hash. In an InternalVoxelLabel, this is used to keep track of
   * a modification. When a paint/erase happens, voxels must be set to null.
   */
  voxels: string | null;
  volumeArrayBuffer?: ArrayBuffer;
  origin?: Vector3D;
  size?: Vector3D;
  color: string;
  alpha: number;
}

export interface LabelAppearance {
  /**
   * Hexadeciaml string like '#ff00ff'.
   */
  color: string;
  /**
   * A float from 0 (transparent) to 1.0 (opaque).
   */
  alpha: number;
}

type ExternalVoxelLabelData = LabelAppearance &
  ({ voxels: null } | { voxels: string; origin: Vector3D; size: Vector3D });

type SolidFigureLabelData = LabelAppearance & {
  min: Vector3D;
  max: Vector3D;
};

type PlaneFigureLabelData = LabelAppearance & {
  min: Vector2D;
  max: Vector2D;
  z: number;
};

type TaggedLabelData =
  | {
      type: 'voxel';
      data: InternalVoxelLabelData;
    }
  | {
      type: 'rectangle' | 'ellipse';
      data: PlaneFigureLabelData;
    }
  | {
      type: 'cuboid' | 'ellipsoid';
      data: SolidFigureLabelData;
    };

/**
 * InternalLabelData resresents one label data stored in browser memory.
 */
export type InternalLabel = {
  name?: string;
  attributes: object;
  temporaryKey: string;
} & TaggedLabelData;

/**
 * ExternalLabelData resresents the label data
 * transferred from/to the API sever.
 */
export type ExternalLabel = {
  name?: string;
  attributes: object;
} & (
  | {
      type: 'voxel';
      data: ExternalVoxelLabelData;
    }
  | {
      type: 'rectangle' | 'ellipse';
      data: PlaneFigureLabelData;
    }
  | {
      type: 'cuboid' | 'ellipsoid';
      data: SolidFigureLabelData;
    }
);

////////////////////////////////////////////////////////////////////////////////

const emptyVoxelLabelData = (
  appearance: LabelAppearance
): InternalVoxelLabelData => {
  return {
    origin: [0, 0, 0],
    size: [16, 16, 16],
    voxels: '',
    volumeArrayBuffer: new ArrayBuffer((16 * 16 * 16) / 8),
    ...appearance
  };
};

export const createNewLabelData = (
  type: LabelType,
  appearance: LabelAppearance,
  viewers: { [index: string]: rs.Viewer }
): TaggedLabelData => {
  switch (type) {
    case 'voxel':
      return { type, data: emptyVoxelLabelData(appearance) };
    case 'cuboid':
    case 'ellipsoid': {
      // Find first visible viewer key
      const key = Object.keys(viewers).find(index =>
        /^(axial|sagittal|coronal)$/.test(index)
      );
      return {
        type,
        data: {
          ...(key
            ? rs.SolidFigure.calculateBoundingBoxWithDefaultDepth(viewers[key])
            : { min: [0, 0, 0], max: [0, 0, 0] }),
          ...appearance
        }
      };
    }
    case 'ellipse':
    case 'rectangle':
      return {
        type,
        data: {
          ...(viewers.axial
            ? rs.PlaneFigure.calculateBoundingBoxAndDepth(viewers.axial)
            : { min: [0, 0], max: [0, 0], z: 0 }),
          ...appearance
        }
      };
  }
};

/**
 * Adds temporary label key.
 * Adds actual `volumeArrayBuffer` data to label.data.
 * If label is unpainted, make an empty buffer or an default annotation.
 */
const externalLabelToInternal = async (
  label: ExternalLabel,
  api: ApiCaller
): Promise<InternalLabel> => {
  const temporaryKey = generateUniqueId();
  const internalLabel = { ...label, temporaryKey } as InternalLabel;

  if (label.type === 'voxel' && internalLabel.type === 'voxel') {
    // The condition above is redundant but used to satisfy type check
    if (label.data.voxels) {
      const volumeArrayBuffer = await api(`blob/${label.data.voxels}`, {
        responseType: 'arraybuffer'
      });
      return produce(internalLabel, label => {
        label.data.volumeArrayBuffer = volumeArrayBuffer;
      });
    } else {
      // Empty label
      return produce(internalLabel, label => {
        label.data = emptyVoxelLabelData(label.data);
      });
    }
  } else {
    return internalLabel;
  }
};

/**
 * Adds temporary label key
 * and asynchronously loads voxel data from API
 * and assigns it to the given label cache.
 */
export const externalRevisionToInternal = async (
  revision: Revision<ExternalLabel>,
  api: any
): Promise<Revision<InternalLabel>> => {
  return await produce(revision, async revision => {
    for (const series of revision.series) {
      (series as any).labels = await asyncMap(series.labels, label =>
        externalLabelToInternal(label, api)
      );
    }
    return revision as Revision<InternalLabel>;
  });
};

export const voxelShrinkToMinimum = (data: InternalVoxelLabelData) => {
  if (!data.origin || !data.size || !data.volumeArrayBuffer) return null;
  const volume = new rs.RawData(data.size, 'binary');
  volume.assign(data.volumeArrayBuffer);
  const cloud = new rs.VoxelCloud(); // temporary
  cloud.origin = [...data.origin];
  cloud.volume = volume;
  const isNotEmpty = cloud.shrinkToMinimum();
  return isNotEmpty ? { origin: cloud.origin, rawData: cloud.volume } : null;
};

const internalLabelToExternal = async (
  label: InternalLabel,
  api: ApiCaller
): Promise<ExternalLabel> => {
  const newData =
    label.type === 'voxel'
      ? prepareLabelSaveDataOfVoxel(label.data, api)
      : label.data;
  return produce<InternalLabel, any, ExternalLabel>(label, label => {
    label.data = newData;
    delete label.temporaryKey;
    return label;
  });
};

const prepareLabelSaveDataOfVoxel = async (
  labelData: InternalVoxelLabelData,
  api: ApiCaller
): Promise<ExternalVoxelLabelData> => {
  const shrinkResult = voxelShrinkToMinimum(labelData);
  if (shrinkResult === null) {
    // No painted voxels
    return {
      voxels: null,
      alpha: labelData.alpha,
      color: labelData.color
    };
  } else {
    // There are painted voxels
    const { origin, rawData } = shrinkResult;
    const voxels = sha1(rawData.data);
    if (voxels === labelData.voxels) {
      // Skipping unchanged label data
    } else {
      await api('blob/' + voxels, {
        method: 'put',
        handleErrors: true,
        data: rawData.data,
        headers: { 'Content-Type': 'application/octet-stream' }
      });
    }
    return {
      voxels,
      origin,
      size: rawData.getDimension(),
      alpha: labelData.alpha,
      color: labelData.color
    };
  }
};

const internalSeriesToExternal = async (
  series: SeriesEntry<InternalLabel>,
  api: any
): Promise<SeriesEntry<ExternalLabel>> => {
  const newLabels = await asyncMap(series.labels, async label =>
    internalLabelToExternal(label, api)
  );
  return produce<SeriesEntry<InternalLabel>, any, SeriesEntry<ExternalLabel>>(
    series,
    series => {
      series.labels = newLabels;
      return series;
    }
  );
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
      internalSeriesToExternal(series, api)
    )
  };

  await api(`cases/${caseId}/revision`, {
    method: 'post',
    data: saveData
  });
};
