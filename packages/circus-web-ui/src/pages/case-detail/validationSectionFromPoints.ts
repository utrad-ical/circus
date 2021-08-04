import { InternalLabelOf } from './labelData';
import createSectionFromPoints from './createSectionFromPoints';

const validationSectionFromPoints = (
  points: InternalLabelOf<'point'>[],
  activePointName: string
) => {
  if (activePointName.indexOf('[') < 0) {
    throw new Error(
      'The name of the three point annotations must be suffixed by [1], [2] and [3]'
    );
  }
  const baseName = activePointName.slice(0, activePointName.indexOf('['));

  const targetPoints: number[][] = [];
  for (let i = 1; i <= 3; i++) {
    if (
      points.filter(label => {
        return new RegExp('^' + baseName + '\\[' + i + '\\]' + '$').test(
          label.name!
        );
      }).length > 0
    ) {
      targetPoints.push(
        points.filter(label => {
          return new RegExp('^' + baseName + '\\[' + i + '\\]' + '$').test(
            label.name!
          );
        })[0].data.location
      );
    }
  }

  if (targetPoints.length !== 3) {
    throw new Error(
      'The name of the three point annotations must be suffixed by [1], [2] and [3]'
    );
  }
  return createSectionFromPoints(targetPoints);
};

export default validationSectionFromPoints;
