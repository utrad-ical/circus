import { Vector3 } from 'three';
import { Section, vectorizeSection } from '../../../common/geometry';
import Viewer from '../../viewer/Viewer';

export default function handleRotationBy(
  viewer: Viewer,
  dhDeg: number,
  dvDeg: number
) {
  const prevState = viewer.getState();
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

function rotateAroundYAxis(section: Section, angle: number): Section {
  const vSection = vectorizeSection(section);
  const rotCenter = vSection.origin.add(vSection.xAxis.divideScalar(2));
  const rotAxis = vSection.yAxis.normalize();
  return rotateSection(section, rotAxis, rotCenter, angle);
}

function rotateAroundXAxis(section: Section, angle: number): Section {
  const vSection = vectorizeSection(section);
  const rotCenter = vSection.origin.add(vSection.yAxis.divideScalar(2));
  const rotAxis = vSection.xAxis.normalize();
  return rotateSection(section, rotAxis, rotCenter, angle);
}

function rotateSection(
  section: Section,
  rotAxis: Vector3,
  rotCenter: Vector3,
  angle: number
): Section {
  const radian = (Math.PI / 180.0) * angle;
  const vSection = vectorizeSection(section);
  return {
    origin: vSection.origin
      .sub(rotCenter)
      .applyAxisAngle(rotAxis, radian)
      .add(rotCenter)
      .toArray(),
    xAxis: vSection.xAxis.applyAxisAngle(rotAxis, radian).toArray(),
    yAxis: vSection.yAxis.applyAxisAngle(rotAxis, radian).toArray()
  };
}
