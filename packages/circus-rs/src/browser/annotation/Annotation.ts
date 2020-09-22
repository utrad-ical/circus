import ViewState from '../ViewState';
import Viewer from '../viewer/Viewer';

export interface DrawOption {
  hover: boolean;
}

export default interface Annotation {
  draw(viewer: Viewer, viewState: ViewState, options: DrawOption): void;

  /**
   * This ID is not used by CIRCUS RS itself, but your application can use
   * this property to identify this annotation.
   */
  id?: string;
}
