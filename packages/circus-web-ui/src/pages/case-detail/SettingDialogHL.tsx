import { Editor } from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React from 'react';
import { HlOptions } from './createHLs';
import SettingDialog from './SettingDialog';

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

const initialOptions = {
  dimension: 2,
  neighbors: 4,
  orientation: 'Axial'
};

const OptionsEditorForHL: Editor<HlOptions> = props => {
  const { value, onChange } = props;
  return (
    <>
      <label>
        Dimension&nbsp;
        <ShrinkSelect
          bsSize="sm"
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
      </label>
      {value.dimension === 2 && (
        <>
          <br />
          <label>
            Orientation&nbsp;
            <ShrinkSelect
              bsSize="sm"
              options={orientationOptions}
              value={value.orientation}
              onChange={v => onChange({ ...value, orientation: v })}
            />
          </label>
        </>
      )}
      <br />
      <label>
        Neighbors to decide same CC&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={
            value.dimension === 2 ? neighborsOptions2D : neighborsOptions3D
          }
          value={value.neighbors}
          onChange={v => onChange({ ...value, neighbors: v })}
          numericalValue
        />
      </label>
    </>
  );
};

const SettingDialogHL: React.FC<{
  onHide: () => void;
  onOkClick: (props: HlOptions) => void;
}> = props => {
  const { onHide, onOkClick } = props;
  return (
    <SettingDialog
      title="Setting options for hole filling"
      optionsEditor={OptionsEditorForHL}
      initialOptions={initialOptions}
      onHide={onHide}
      onOkClick={onOkClick}
    />
  );
};

export default SettingDialogHL;
