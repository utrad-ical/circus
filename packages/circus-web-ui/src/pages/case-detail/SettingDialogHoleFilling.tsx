import React, { useState } from 'react';
import { Button, Modal } from 'components/react-bootstrap';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
// import SettimgDialog from './SettingDialog';
import * as et from '@smikitky/rb-components/lib/editor-types';
import { Editor } from '@smikitky/rb-components/lib/editor-types';

const SettingDialog: React.FC<{
  optionsEditor: Editor<any>;
  initialOptions: any;
}> = props => {
  const { optionsEditor: OptionsEditor, initialOptions } = props;
  const [options, setOptions] = useState(initialOptions);

  return (
    <>
      <Modal.Header></Modal.Header>
      <Modal.Body>
        <OptionsEditor value={options} onChange={setOptions} />
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => console.log('Hide')}>
          Cancel
        </Button>
        <Button onClick={() => console.log('OK')} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

// value / onChange を受け取るものなら何でも良い
const OptionsEditorForHL: Editor<any> = props => {
  const { value, onChange } = props;
  return (
    <>
      <label>
        Dimension&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={dimensionOptions}
          value={value.dimension}
          onChange={v => onChange({ ...value, dimension: v })}
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
          value={value.neighbors4or6}
          onChange={v => onChange({ ...value, neighbors4or6: v })}
          numericalValue
        />
      </label>
    </>
  );
};

const initialOptions = {
  dimension: 2,
  neighbors4or6: 1,
  orientation: 'Axial'
};

const SettingDialogHoleFilling = () => {
  return (
    <SettingDialog
      optionsEditor={OptionsEditorForHL}
      initialOptions={initialOptions}
    />
  );
};

interface ParameterType {
  dimension: 2 | 3;
  neighbors4or6: 1 | 2;
  orientation: 'Axial' | 'Coronal' | 'Sagital';
}

const neighborsOptions2D = {
  1: '4-neigobors',
  2: '8-neigobors'
};
const neighborsOptions3D = {
  1: '6-neigobors',
  2: '26-neigobors'
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

const initialValues = {
  dimension: 2,
  neighbors4or6: 1,
  orientation: 'Axial'
};

// const SettingDialogHoleFilling: React.FC<{
//   onHide: () => void;
//   onOkClick: (
//     dimension: number,
//     orientation: 'Axial' | 'Coronal' | 'Sagital' | null,
//     neighbors4or6: boolean
//   ) => void;
// }> = React.memo(props => {
//   const { onHide, onOkClick } = props;
//   const [holeFillingProperties, setHoleFillingProperties] = useState([
//     {
//       key: 'dimension',
//       caption: 'Dimension',
//       editor: et.shrinkSelect(dimensionOptions)
//     },
//     {
//       key: 'orientation',
//       caption: 'Orientation',
//       editor: et.shrinkSelect(orientationOptions)
//     },
//     {
//       key: 'neighbors4or6',
//       caption: 'Neighbors to decide same CC',
//       editor: et.shrinkSelect(neighborsOptions2D)
//     }
//   ]);
//   const handlePropertiesChange = (parameters: ParameterType) => {
//     setHoleFillingProperties(
//       Number(parameters.dimension) === 3
//         ? [
//             {
//               key: 'dimension',
//               caption: 'Dimension',
//               editor: et.shrinkSelect(dimensionOptions)
//             },
//             {
//               key: 'neighbors4or6',
//               caption: 'Neighbors to decide same CC',
//               editor: et.shrinkSelect(neighborsOptions3D)
//             }
//           ]
//         : [
//             {
//               key: 'dimension',
//               caption: 'Dimension',
//               editor: et.shrinkSelect(dimensionOptions)
//             },
//             {
//               key: 'orientation',
//               caption: 'Orientation',
//               editor: et.shrinkSelect(orientationOptions)
//             },
//             {
//               key: 'neighbors4or6',
//               caption: 'Neighbors to decide same CC',
//               editor: et.shrinkSelect(neighborsOptions2D)
//             }
//           ]
//     );
//   };

//   return (
//     <SettingDialog
//       title="Setting options for hole filling"
//       initialValues={initialValues}
//       properties={holeFillingProperties}
//       onChange={handlePropertiesChange}
//       onHide={() => onHide()}
//       onOkClick={(parameters: ParameterType) => {
//         onOkClick(
//           Number(parameters.dimension),
//           parameters.orientation,
//           Number(parameters.neighbors4or6) === 1
//         );
//       }}
//     />
//   );
// });

export default SettingDialogHoleFilling;
