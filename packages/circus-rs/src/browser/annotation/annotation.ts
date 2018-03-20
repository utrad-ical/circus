import { Sprite } from '../../browser/viewer/sprite';
import ViewState from '../ViewState';
import { Viewer } from '../viewer/viewer';

export interface Annotation {
  draw: (viewer: Viewer, viewState: ViewState) => Sprite | null;
}
