import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Section, Vector2D, Vector3D } from '@utrad-ical/circus-rs/src/browser';
import { detectOrthogonalSection } from '@utrad-ical/circus-rs/src/browser/section-util';
import focusBy from '@utrad-ical/circus-rs/src/browser/tool/state/focusBy';
import produce from 'immer';
import { ApiCaller } from 'utils/api';
import { sha1 } from 'utils/util';

export type LabelType =
  | 'voxel'
  | 'cuboid'
  | 'ellipsoid'
  | 'rectangle'
  | 'ellipse'
  | 'point'
  | 'ruler';

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

type PlaneFigureLabelData = LabelAppearance & PlaneFigureAnnotationData;
type PlaneFigureAnnotationData = {
  min: Vector2D;
  max: Vector2D;
  z: number;
};

type PointLabelData = LabelAppearance & {
  point: Vector3D;
};

type RulerLabelData = LabelAppearance & {
  section: Section;
  start: Vector3D;
  end: Vector3D;
  labelPosition?: Vector2D;
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
    }
  | {
      type: 'point';
      data: PointLabelData;
    }
  | {
      type: 'ruler';
      data: RulerLabelData;
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
  hidden: boolean;
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
  | {
      type: 'point';
      data: PointLabelData;
    }
  | {
      type: 'ruler';
      data: RulerLabelData;
    }
);

export const labelTypes: {
  [key in LabelType]: { icon: string; canConvertTo?: LabelType };
} = {
  voxel: { icon: 'circus-annotation-voxel' },
  cuboid: { icon: 'circus-annotation-cuboid', canConvertTo: 'ellipsoid' },
  ellipsoid: { icon: 'circus-annotation-ellipsoid', canConvertTo: 'cuboid' },
  rectangle: { icon: 'circus-annotation-rectangle', canConvertTo: 'ellipse' },
  ellipse: { icon: 'circus-annotation-ellipse', canConvertTo: 'rectangle' },
  point: { icon: 'circus-annotation-point' },
  ruler: { icon: 'circus-annotation-ruler' }
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
  viewer?: rs.Viewer
): TaggedLabelData => {
  switch (type) {
    case 'voxel':
      return { type, data: emptyVoxelLabelData(appearance) };
    case 'cuboid':
    case 'ellipsoid': {
      return {
        type,
        data: {
          ...(viewer
            ? rs.SolidFigure.calculateBoundingBoxWithDefaultDepth(viewer)
            : { min: [0, 0, 0], max: [10, 10, 10] }),
          ...appearance
        }
      };
    }
    case 'ellipse':
    case 'rectangle': {
      const planeFigureAnnotaion = rs.createDefaultPlaneFigureFromViewer(
        viewer,
        { type: type === 'ellipse' ? 'circle' : 'rectangle' }
      );
      return {
        type,
        data: {
          ...appearance,
          ...extractPlaneFigureAnnotationData(planeFigureAnnotaion)
        }
      };
    }
    case 'point': {
      return {
        type,
        data: {
          ...(viewer
            ? rs.Point.calculateDefaultPoint(viewer)
            : { point: [0, 0, 0] }),
          ...appearance
        }
      };
    }
    case 'ruler': {
      return {
        type,
        data: {
          ...(viewer
            ? rs.Ruler.calculateDefaultRuler(viewer)
            : {
                section: {
                  origin: [0, 0, 0],
                  xAxis: [10, 0, 0],
                  yAxis: [0, 10, 0]
                },
                start: [0, 0, 0],
                end: [10, 10, 0]
              }),
          ...appearance
        }
      };
    }
  }
};

/**
 * Takes label data fetched from API and do preparation tasks.
 * 1. Adds `temporaryKey` for identify each label.
 * 2. Loads and assigns an array buffer for each voxel label.
 */
export const externalLabelToInternal = async (
  label: ExternalLabel,
  api: ApiCaller
): Promise<InternalLabel> => {
  const temporaryKey = generateUniqueId();
  const internalLabel = {
    ...label,
    temporaryKey,
    hidden: false
  } as InternalLabel;

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

export const internalLabelToExternal = async (
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
    delete (label as any).temporaryKey;
    delete (label as any).hidden;
    return label as ExternalLabel;
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
    case 'point': {
      const point = new rs.Point();
      point.id = label.temporaryKey;
      point.editable = true;
      point.color = rgbaColor(appearance.color, appearance.alpha);
      point.point = label.data.point;
      return point;
    }

    case 'ruler': {
      const ruler = new rs.Ruler();
      ruler.id = label.temporaryKey;
      ruler.editable = true;
      ruler.color = rgbaColor(appearance.color, appearance.alpha);
      ruler.section = label.data.section;
      ruler.start = label.data.start;
      ruler.end = label.data.end;
      if (label.data.labelPosition)
        ruler.labelPosition = label.data.labelPosition;
      return ruler;
    }
  }
};

const getCenterOfLabel = (
  composition: rs.Composition,
  label: InternalLabel
): Vector3D | undefined => {
  switch (label.type) {
    case 'voxel': {
      const src = composition.imageSource as rs.MprImageSource;
      if (!src.metadata) return;

      const shrinkResult = voxelShrinkToMinimum(label.data);
      if (shrinkResult === null) return;

      const origin = shrinkResult.origin;
      const size = shrinkResult.rawData.getDimension();
      const { voxelSize } = src.metadata;

      return [
        (origin[0] + size[0]) * voxelSize[0],
        (origin[1] + size[1]) * voxelSize[1],
        (origin[2] + size[2]) * voxelSize[2]
      ];
    }
    case 'cuboid':
    case 'ellipsoid': {
      const { min, max } = label.data;
      return [
        min[0] + (max[0] - min[0]) * 0.5,
        min[1] + (max[1] - min[1]) * 0.5,
        min[2] + (max[2] - min[2]) * 0.5
      ];
    }
    case 'rectangle':
    case 'ellipse': {
      const { min, max, z } = label.data;
      return [
        min[0] + (max[0] - min[0]) * 0.5,
        min[1] + (max[1] - min[1]) * 0.5,
        z
      ];
    }
    case 'point':
      return label.data.point;
    case 'ruler': {
      const { start, end } = label.data;
      return [
        start[0] + (end[0] - start[0]) * 0.5,
        start[1] + (end[1] - start[1]) * 0.5,
        start[2] + (end[2] - start[2]) * 0.5
      ];
    }
    default:
      throw new Error('Undefined label type');
  }
};

export const setRecommendedDisplay = (
  composition: rs.Composition,
  viewers: rs.Viewer[],
  label: InternalLabel
) => {
  switch (label.type) {
    case 'ruler': {
      const center = getCenterOfLabel(composition, label);
      const reproduceSection = label.data.section;
      const reproduceOrientation = detectOrthogonalSection(reproduceSection);
      viewers.forEach(viewer => {
        const orientation = detectOrthogonalSection(viewer.getState().section);
        if (orientation === reproduceOrientation) {
          viewer.setState({ ...viewer.getState(), section: reproduceSection });
        } else {
          focusBy(viewer, center);
        }
      });
      break;
    }
    default: {
      const center = getCenterOfLabel(composition, label);
      viewers.forEach(viewer => focusBy(viewer, center));
    }
  }
};

function extractPlaneFigureAnnotationData(
  fig: rs.PlaneFigure
): PlaneFigureAnnotationData {
  const { min, max, z } = fig;
  return { min: min! as Vector2D, max: max as Vector2D, z: z! };
}
