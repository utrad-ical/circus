import type Viewer from '../viewer/Viewer.ts';
import type ViewState from '../ViewState.ts';

export interface DrawHints {
  hover?: boolean;
  draftImage?: boolean;
  requestingViewState?: ViewState;
}

export default interface Annotation {
  draw(viewer: Viewer, viewState: ViewState, hints: DrawHints): void;

  /**
   * This ID is not used by CIRCUS RS itself, but your application can use
   * this property to identify this annotation.
   */
  id?: string;
}
