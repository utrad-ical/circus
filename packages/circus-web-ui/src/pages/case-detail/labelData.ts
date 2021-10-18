import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { Section, Vector2D, Vector3D } from '@utrad-ical/circus-rs/src/browser';
import {
  convertToSection2D,
  detectOrthogonalSection
} from '@utrad-ical/circus-rs/src/browser/section-util';
import focusBy from '@utrad-ical/circus-rs/src/browser/tool/state/focusBy';
import { gzipSync } from 'fflate';
import produce from 'immer';
import { ApiCaller } from 'utils/api';
import { sha1 } from 'utils/util';

type InternalLabelDataMap = {
  voxel: InternalVoxelLabelData;
  rectangle: PlaneFigureLabelData;
  ellipse: PlaneFigureLabelData;
  cuboid: SolidFigureLabelData;
  ellipsoid: SolidFigureLabelData;
  point: PointLabelData;
  ruler: RulerLabelData;
};

export type LabelType = keyof InternalLabelDataMap;

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

type InternalVoxelLabelData = LabelAppearance & {
  /**
   * Contains hash. In an InternalVoxelLabel, this is used to keep track of
   * a modification. When a paint/erase happens, voxels must be set to null.
   */
  voxels: string | null;
  volumeArrayBuffer?: ArrayBuffer;
  origin?: Vector3D;
  size?: Vector3D;
};

type ExternalVoxelLabelData = LabelAppearance &
  ({ voxels: null } | { voxels: string; origin: Vector3D; size: Vector3D });

type SolidFigureLabelData = LabelAppearance & SolidFigureAnnotationData;
type SolidFigureAnnotationData = {
  min: Vector3D;
  max: Vector3D;
};

type PlaneFigureLabelData = LabelAppearance & PlaneFigureAnnotationData;
type PlaneFigureAnnotationData = {
  min: Vector2D;
  max: Vector2D;
  z: number;
};

type PointLabelData = LabelAppearance & PointAnnotationData;
type PointAnnotationData = {
  location: Vector3D;
};

type RulerLabelData = LabelAppearance & RulerAnnotationData;
type RulerAnnotationData = {
  section: Section;
  start: Vector3D;
  end: Vector3D;
  labelPosition?: Vector2D;
};

export type InternalLabelDataOf<T extends keyof InternalLabelDataMap> = {
  type: T;
  data: InternalLabelDataMap[T];
};

export type InternalLabelData = {
  [T in keyof InternalLabelDataMap]: InternalLabelDataOf<T>;
}[keyof InternalLabelDataMap];

export type InternalLabelOf<T extends keyof InternalLabelDataMap> = {
  type: T;
  name?: string;
  attributes: object;
  temporaryKey: string;
  hidden: boolean;
  data: InternalLabelDataMap[T];
};

/**
 * InternalLabel resresents one label data stored in browser memory.
 */
export type InternalLabel = {
  [T in keyof InternalLabelDataMap]: InternalLabelOf<T>;
}[keyof InternalLabelDataMap];

/**
 * ExternalLabel resresents the label data
 * transferred from/to the API sever.
 */
export type ExternalLabel = {
  name?: string;
  attributes: object;
} & (
  | { type: 'voxel'; data: ExternalVoxelLabelData }
  | InternalLabelDataOf<'ellipse'>
  | InternalLabelDataOf<'rectangle'>
  | InternalLabelDataOf<'ellipsoid'>
  | InternalLabelDataOf<'cuboid'>
  | InternalLabelDataOf<'point'>
  | InternalLabelDataOf<'ruler'>
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

export const createNewLabelData = <T extends LabelType>(
  type: T,
  appearance: LabelAppearance,
  viewer?: rs.Viewer
): InternalLabelDataOf<T> => {
  switch (type) {
    case 'voxel':
      return {
        type,
        data: emptyVoxelLabelData(appearance)
      } as InternalLabelDataOf<T>;
    case 'cuboid':
    case 'ellipsoid': {
      const solidFigureAnnotaion = rs.createDefaultSolidFigureFromViewer(
        viewer,
        { type: type === 'ellipsoid' ? 'ellipsoid' : 'cuboid' }
      );
      return {
        type,
        data: {
          ...appearance,
          ...extractSolidFigureAnnotationData(solidFigureAnnotaion)
        }
      } as InternalLabelDataOf<T>;
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
      } as InternalLabelDataOf<T>;
    }
    case 'point': {
      const pointAnnotaion = rs.createDefaultPointFromViewer(viewer, {});
      return {
        type,
        data: {
          ...appearance,
          ...extractPointAnnotationData(pointAnnotaion)
        }
      } as InternalLabelDataOf<T>;
    }
    case 'ruler': {
      const rulerAnnotaion = rs.createDefaultRulerFromViewer(viewer, {});
      return {
        type,
        data: {
          ...appearance,
          ...extractRulerAnnotationData(rulerAnnotaion)
        }
      } as InternalLabelDataOf<T>;
    }
    default:
      throw new Error('Unknown label type');
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
  const internalLabel: InternalLabel = {
    ...label,
    temporaryKey,
    hidden: false
  };

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
      const hash = await sha1(shrinkResult.rawData.data);
      if (hash !== data.voxels) {
        // Voxel data has changed
        await api('blob/' + hash, {
          method: 'put',
          handleErrors: true,
          data: gzipSync(new Uint8Array(shrinkResult.rawData.data)),
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'gzip'
          }
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
      point.location = label.data.location;
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
      if (!src || !src.metadata) return;

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
      return label.data.location;
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
      viewers
        .filter(viewer => viewer.getComposition() === composition)
        .forEach(viewer => {
          switch (viewer.getState().type) {
            case '2d':
              {
                const prevState =
                  viewer.getState() as rs.TwoDimensionalViewState;
                viewer.setState({
                  ...prevState,
                  section: convertToSection2D(reproduceSection)
                });
              }
              break;
            case 'mpr':
              {
                const prevState = viewer.getState() as rs.MprViewState;
                const prevSection = rs.getSectionDrawingViewState(prevState);
                const orientation = detectOrthogonalSection(prevSection);
                if (orientation === reproduceOrientation) {
                  viewer.setState({
                    ...prevState,
                    section: reproduceSection
                  });
                } else {
                  focusBy(viewer, center);
                }
              }
              break;
            case 'vr':
              {
                const prevState = viewer.getState() as rs.VrViewState;
                const prevSection = rs.getSectionDrawingViewState(prevState);
                const orientation = detectOrthogonalSection(prevSection);
                if (orientation === reproduceOrientation) {
                  viewer.setState({
                    ...prevState,
                    section: reproduceSection
                  });
                } else {
                  focusBy(viewer, center);
                }
              }
              break;
            default: {
              throw new Error('Unsupported view state');
            }
          }
        });
      break;
    }
    default: {
      const center = getCenterOfLabel(composition, label);
      viewers
        .filter(viewer => viewer.getComposition() === composition)
        .forEach(viewer => focusBy(viewer, center));
    }
  }
};

const extractSolidFigureAnnotationData = (
  fig: rs.SolidFigure
): SolidFigureAnnotationData => {
  const { min, max } = fig;
  return { min: min! as Vector3D, max: max as Vector3D };
};

const extractPlaneFigureAnnotationData = (
  fig: rs.PlaneFigure
): PlaneFigureAnnotationData => {
  const { min, max, z } = fig;
  return { min: min! as Vector2D, max: max as Vector2D, z: z! };
};

const extractPointAnnotationData = (fig: rs.Point): PointAnnotationData => {
  const { location } = fig;
  return { location: location! as Vector3D };
};

const extractRulerAnnotationData = (fig: rs.Ruler): RulerAnnotationData => {
  const { section, start, end } = fig;
  return {
    section: section! as Section,
    start: start! as Vector3D,
    end: end! as Vector3D
  };
};
