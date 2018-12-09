import ViewState from '../ViewState';
import Viewer from '../viewer/Viewer';

export interface DrawOption {
  hover: boolean;
}
export default interface Annotation {
  draw(viewer: Viewer, viewState: ViewState, options: DrawOption): void;
}
