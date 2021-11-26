import { ViewState } from 'browser';

const determineColor = (
  viewState: ViewState,
  distance: number,
  distanceThreshold: number,
  distanceDimmedThreshold: number,
  color: string | undefined,
  dimmedColor: string | undefined
): string | undefined => {
  if (viewState.type == '2d') {
    distanceThreshold = 0;
    distanceDimmedThreshold = 0;
  }

  switch (true) {
    case distance <= distanceThreshold:
      return color;
    case distance <= distanceDimmedThreshold:
      return dimmedColor;
    default:
      return;
  }
};

export default determineColor;
