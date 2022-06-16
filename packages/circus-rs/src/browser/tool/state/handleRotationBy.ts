import { rotateAroundXAxis, rotateAroundYAxis } from '../../section-util';
import Viewer from '../../viewer/Viewer';

export default function handleRotationBy(
  viewer: Viewer,
  dhDeg: number,
  dvDeg: number
) {
  const prevState = viewer.getState();
  if (!prevState) return;

  switch (prevState.type) {
    case 'mpr':
    case 'vr': {
      let section = prevState.section;
      if (Math.abs(dhDeg)) {
        section = rotateAroundYAxis(section, -dhDeg);
      }
      if (Math.abs(dvDeg)) {
        section = rotateAroundXAxis(section, dvDeg);
      }
      viewer.setState({ ...prevState, section });
      break;
    }
  }
}
