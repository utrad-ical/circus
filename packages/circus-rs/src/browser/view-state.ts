import { ImageSource } from './image-source/image-source';
import { Section } from '../common/geometry';
import { ViewWindow } from '../common/ViewWindow';

export type InterpolationMode = 'trilinear' | 'nearestNeighbor';

/**
 * ViewState determines how the ImageSource is viewed on each Viewer.
 */
export interface ViewState {
  section?: Section;
  window?: ViewWindow;
  interpolationMode?: InterpolationMode;
}
