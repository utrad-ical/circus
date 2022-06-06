import { rotateAroundXAxis, rotateAroundYAxis } from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';

export default function handleRotationBy(
  viewer: Viewer,
  dhDeg: number,
  dvDeg: number,
  baseState?: ViewState
) {
  if (!baseState) baseState = viewer.getRequestingStateOrState();
  switch (baseState.type) {
    case 'mpr':
    case 'vr': {
      let section = baseState.section;
      if (Math.abs(dhDeg)) {
        section = rotateAroundYAxis(section, -dhDeg);
      }
      if (Math.abs(dvDeg)) {
        section = rotateAroundXAxis(section, dvDeg);
      }
      viewer.setState({ ...baseState, section });
      break;
    }
  }
}
