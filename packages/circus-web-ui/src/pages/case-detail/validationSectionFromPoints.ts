import { Vector3D } from '@utrad-ical/circus-lib/src/generateMhdHeader';
import { InternalLabelOf } from './labelData';

const validationSectionFromPoints = (
  points: InternalLabelOf<'point'>[],
  activePointName: string
) => {
  if (activePointName.indexOf('[') < 0) {
    return 'The name of the three point annotations must be suffixed by [1], [2] and [3]';
  }
  const baseName = activePointName.slice(0, activePointName.indexOf('['));

  const targetPoints: Vector3D[] = [];
  for (let i = 1; i <= 3; i++) {
    const labelName = baseName + '[' + i.toString() + ']';
    if (
      points.filter(label => {
        return label.name!.indexOf(labelName) === 0;
      }).length > 0
    ) {
      targetPoints.push(
        points.filter(label => {
          return label.name!.indexOf(labelName) === 0;
        })[0].data.location
      );
    }
  }

  if (targetPoints.length !== 3) {
    return 'The name of the three point annotations must be suffixed by [1], [2] and [3]';
  }
  return targetPoints;
};

export default validationSectionFromPoints;
