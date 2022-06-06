import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';

export interface DrawOption {
  hover?: boolean;
  draftImage?: boolean;
  requestingViewState?: ViewState;
}

export default interface Annotation {
  draw(
    viewer: Viewer,
    viewState: ViewState | undefined,
    options: DrawOption
  ): void;

  /**
   * This ID is not used by CIRCUS RS itself, but your application can use
   * this property to identify this annotation.
   */
  id?: string;
}
