import { TransferFunction } from '../../ViewState';
import { ViewWindow } from '../../../common/ViewWindow';
import { transferFunctionOrigin, transferFunctionRange } from './constants';

type TransferFunctionDefinition = [number, string][];

export function createTransferFunction(
  definition: TransferFunctionDefinition
): TransferFunction {
  const transferFunction: TransferFunction = definition
    .sort((a, b) => (a[0] === b[0] ? 0 : a[0] < b[0] ? -1 : 1))
    .map(([value, color]) => ({
      position: (value - transferFunctionOrigin) / transferFunctionRange,
      color
    }));

  if (
    transferFunction.length < 0 ||
    transferFunction[0].position < 0.0 ||
    1.0 < transferFunction[transferFunction.length - 1].position
  ) {
    console.log(transferFunction);
    throw new Error('Invalid transfer function definition');
  }

  if (transferFunction[0].position !== 0.0) {
    transferFunction.unshift({
      position: 0.0,
      color: transferFunction[0].color
    });
  }

  if (transferFunction[transferFunction.length - 1].position !== 1.0) {
    transferFunction.push({
      position: 1.0,
      color: transferFunction[transferFunction.length - 1].color
    });
  }

  return transferFunction;
}

export function getDefinitionOfTransferFunction(
  transferFunction: TransferFunction
): TransferFunctionDefinition {
  return transferFunction
    .slice(1, transferFunction.length - 1)
    .map(
      ({ position, color }) =>
        [
          Number(
            (position * transferFunctionRange + transferFunctionOrigin).toFixed(
              1
            )
          ),
          color
        ] as [number, string]
    );
}

export function windowToTransferFunction(
  window: ViewWindow,
  rangeRate: number = 0.5
): TransferFunction {
  const { level, width } = window;

  return createTransferFunction([
    [level - width * 0.5 * rangeRate, '#00000000'],
    [level + width * 0.5 * rangeRate, '#ffffffff']
  ]);
}

export function mprTransferFunction(
  window: ViewWindow,
  rangeRate: number = 1.0
): TransferFunction {
  const { level, width } = window;

  return createTransferFunction([
    [level - width * 0.5 * rangeRate - 1, '#00000000'],
    [level - width * 0.5 * rangeRate, '#000000ff'],
    [level + width * 0.5 * rangeRate, '#ffffffff']
  ]);
}
