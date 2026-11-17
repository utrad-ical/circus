import type { Editor } from './processor-types.ts';
import Select from '#components/Select.tsx';
import React from 'react';
import NumberInput from '#components/NumberInput.tsx';
import type { HoleFillingOptions } from './hf-processor.ts';

const neighborsOptions2D = {
  4: '4-neigobors',
  8: '8-neigobors'
};

const neighborsOptions3D = {
  6: '6-neigobors',
  26: '26-neigobors'
};

const dimensionOptions = {
  2: '2D',
  3: '3D'
};

const orientationOptions = {
  Axial: 'Axial',
  Coronal: 'Coronal',
  Sagital: 'Sagital'
};

export const initialOptions: HoleFillingOptions = {
  dimension: 2,
  neighbors: 4,
  orientation: 'Axial',
  bufferSize: 255
};

export const OptionsEditor: Editor<HoleFillingOptions> = props => {
  const { value, onChange } = props;

  return (
    <>
      <div>
        Dimension&nbsp;
        <Select
          size="small"
          options={dimensionOptions}
          value={value.dimension}
          onChange={v =>
            onChange({
              ...value,
              dimension: v,
              neighbors:
                v === 2
                  ? value.neighbors in neighborsOptions2D
                    ? value.neighbors
                    : value.neighbors === 6
                      ? 4
                      : 8
                  : value.neighbors in neighborsOptions3D
                    ? value.neighbors
                    : value.neighbors === 4
                      ? 6
                      : 26
            })
          }
          numericalValue
        />
        {value.dimension === 2 && (
          <>
            &ensp;Orientation&nbsp;
            <Select
              size="small"
              options={orientationOptions}
              value={value.orientation}
              onChange={v => onChange({ ...value, orientation: v })}
            />
          </>
        )}
      </div>
      <div>
        Neighbors to decide same CC&nbsp;
        <Select
          size="small"
          options={
            value.dimension === 2 ? neighborsOptions2D : neighborsOptions3D
          }
          value={value.neighbors}
          onChange={v => onChange({ ...value, neighbors: v })}
          numericalValue
        />
      </div>
      <label
        className="maximum-number-of-tentative-label"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}
      >
        Maximum number of tentative labels
        <NumberInput
          style={{ width: '6em' }}
          name="bufferSize"
          min={1}
          max={2 ** 16 - 1}
          value={value.bufferSize}
          // Values out of the range (and an empty box) keep the previous value
          onChange={v => {
            if (v === undefined || v < 1 || 2 ** 16 <= v) return;
            onChange({ ...value, bufferSize: v });
          }}
        />
      </label>
    </>
  );
};
