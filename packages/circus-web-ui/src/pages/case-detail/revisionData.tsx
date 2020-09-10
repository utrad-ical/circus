import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import {
  getBoxCenter,
  Vector2D,
  Vector3D
} from '@utrad-ical/circus-rs/src/browser';
import produce from 'immer';
import { ApiCaller } from 'utils/api';
import { sha1 } from 'utils/util';
import asyncMap from '../../utils/asyncMap';

export interface EditingData {
  revision: Revision;
  /**
   * The index of the active series. Always >= 0.
   */
  activeSeriesIndex: number;
  /**
   * The index of the active label in the active series.
   * May be `-1`, which means the current series has no label.
   */
  activeLabelIndex: number;
}

/**
 * Immer-backed update function used to modify the current EditingData.
 * @param update The updater function that takes the 'draft' state.
 * @param tag Used for history handling. If similar small operations happen
 * many times, giving the same string as a tag will make them coalesce.
 * Don't give tags for important operations that can be undone individually.
 */
export type EditingDataUpdater = (
  updater: (current: EditingData) => EditingData | void,
  tag?: string
) => void;

export interface Revision<
  L extends InternalLabel | ExternalLabel = InternalLabel
> {
  creator: string;
  date: string;
  description: string;
  attributes: object;
  series: SeriesEntry<L>[];
  status: string;
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
 * InternalLabel resresents one label data stored in browser memory.
 */
export type InternalLabel = {
  name?: string;
  attributes: object;
  /**
   * A string unique ID (used in web-ui only; not saved on DB)
   */
  temporaryKey: string;
} & TaggedLabelData;

/**
 * ExternalLabel resresents the label data
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

export const labelTypes: {
  [key in LabelType]: { icon: string; canConvertTo?: LabelType };
} = {
  voxel: { icon: 'circus-annotation-voxel' },
  cuboid: { icon: 'circus-annotation-cuboid', canConvertTo: 'ellipsoid' },
  ellipsoid: { icon: 'circus-annotation-ellipsoid', canConvertTo: 'cuboid' },
  rectangle: { icon: 'circus-annotation-rectangle', canConvertTo: 'ellipse' },
  ellipse: { icon: 'circus-annotation-ellipse', canConvertTo: 'rectangle' }
};

////////////////////////////////////////////////////////////////////////////////

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
      // Find the key of the first visible viewer, on which a new label is based
      const key = Object.keys(viewers).find(index =>
        /^(axial|sagittal|coronal)$/.test(index)
      );
      return {
        type,
        data: {
          ...(key
            ? rs.SolidFigure.calculateBoundingBoxWithDefaultDepth(viewers[key])
            : { min: [0, 0, 0], max: [10, 10, 10] }),
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
            : { min: [0, 0], max: [10, 10], z: 0 }),
          ...appearance
        }
      };
  }
};

/**
 * Takes label data fetched from API and do preparation tasks.
 * 1. Adds `temporaryKey` for identify each label.
 * 2. Loads and assigns an array buffer for each voxel label.
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

const internalLabelToExternal = async (
  label: InternalLabel,
  api: ApiCaller
): Promise<ExternalLabel> => {
  const saveVoxels = async (): Promise<ExternalVoxelLabelData> => {
    const data = label.data as InternalVoxelLabelData;
    const shrinkResult = voxelShrinkToMinimum(data);
    if (shrinkResult === null) {
      return { voxels: null, alpha: data.alpha, color: data.color };
    } else {
      const hash = sha1(shrinkResult.rawData.data);
      if (hash !== data.voxels) {
        // Voxel data has changed
        await api('blob/' + hash, {
          method: 'put',
          handleErrors: true,
          data: shrinkResult.rawData.data,
          headers: { 'Content-Type': 'application/octet-stream' }
        });
      }
      return {
        voxels: hash,
        origin: shrinkResult.origin,
        size: shrinkResult.rawData.getDimension(),
        alpha: data.alpha,
        color: data.color
      };
    }
  };

  return produce(label, async label => {
    if (label.type === 'voxel') label.data = await saveVoxels();
    delete label.temporaryKey;
    return label as ExternalLabel;
  });
};

/**
 * Takes the revision data fetched from the API server and converts them
 * to the internal representation with temporary keys and array buffers.
 */
export const externalRevisionToInternal = async (
  revision: Revision<ExternalLabel>,
  api: ApiCaller
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

const internalSeriesToExternal = async (
  series: SeriesEntry<InternalLabel>,
  api: ApiCaller
): Promise<SeriesEntry<ExternalLabel>> => {
  const newLabels = await asyncMap(series.labels, async label =>
    internalLabelToExternal(label, api)
  );
  return produce(series, series => {
    (series as any).labels = newLabels;
    return series as SeriesEntry<ExternalLabel>;
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
  const saveData: Partial<Revision<ExternalLabel>> = {
    description,
    attributes: revision.attributes,
    series: await asyncMap(revision.series, async series =>
      internalSeriesToExternal(series, api)
    ),
    status: 'approved'
  };

  await api(`cases/${caseId}/revision`, {
    method: 'post',
    data: saveData
  });
};

const rgbaColor = (rgb: string, alpha: number): string =>
  rgb +
  Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0');

export const buildAnnotation = (
  label: InternalLabel,
  appearance: LabelAppearance,
  isActive: boolean
): rs.Annotation => {
  switch (label.type) {
    case 'voxel': {
      const volume = new rs.RawData(label.data.size!, 'binary');
      volume.assign(
        isActive
          ? label.data.volumeArrayBuffer!.slice(0)
          : label.data.volumeArrayBuffer!
      );
      const cloud = new rs.VoxelCloud();
      cloud.origin = label.data.origin;
      cloud.volume = volume;
      cloud.color = appearance.color;
      cloud.alpha = appearance.alpha;
      cloud.active = isActive;
      cloud.id = label.temporaryKey;
      return cloud;
    }
    case 'ellipsoid':
    case 'cuboid': {
      const fig =
        label.type === 'ellipsoid' ? new rs.Ellipsoid() : new rs.Cuboid();
      fig.editable = true;
      fig.color = rgbaColor(appearance.color, appearance.alpha);
      fig.min = label.data.min;
      fig.max = label.data.max;
      fig.id = label.temporaryKey;
      return fig;
    }
    case 'ellipse':
    case 'rectangle': {
      const fig = new rs.PlaneFigure();
      fig.type = label.type === 'ellipse' ? 'circle' : 'rectangle';
      fig.editable = true;
      fig.color = rgbaColor(appearance.color, appearance.alpha);
      fig.min = label.data.min;
      fig.max = label.data.max;
      fig.z = label.data.z;
      fig.id = label.temporaryKey;
      return fig;
    }
  }
};

export const getCenterOfLabel = (
  composition: rs.Composition,
  label: InternalLabel
) => {
  switch (label.type) {
    case 'voxel': {
      const shrinkResult = voxelShrinkToMinimum(label.data);
      if (shrinkResult === null) return;
      const origin = shrinkResult.origin;
      const size = shrinkResult.rawData.getDimension();
      return getBoxCenter(
        rs.VoxelCloud.getBoundingBox(composition, { origin, size })
      );
    }
    case 'cuboid':
    case 'ellipsoid':
      return getBoxCenter(label.data);
    case 'rectangle':
    case 'ellipse':
      return getBoxCenter(rs.PlaneFigure.getOutline(label.data));
    default:
      return;
  }
};
