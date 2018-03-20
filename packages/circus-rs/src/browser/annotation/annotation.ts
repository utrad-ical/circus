import Sprite from '../../browser/viewer/Sprite';
import ViewState from '../ViewState';
import Viewer from '../viewer/Viewer';

export interface Annotation {
  draw: (viewer: Viewer, viewState: ViewState) => Sprite | null;
}
