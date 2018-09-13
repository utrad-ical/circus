import React from 'react';
import BodyPartIcon from 'components/BodyPartIcon';
import PropertyEditor from 'rb/PropertyEditor';
import ShrinkSelect from 'rb/ShrinkSelect';
import ColorPicker from 'rb/ColorPicker';

const GlyphPicker = props => {
  const glyphs = [
    'stomach',
    'brain',
    'lung',
    'liver',
    'bone',
    'breast',
    'heart',
    'colon',
    'face',
    'abdomen',
    'joint',
    'kidney',
    'artery',
    'pancreas',
    'calc',
    'visualize',
    'measure',
    'cpu',
    'scanner',
    'atom',
    'person'
  ];
  const options = {};
  glyphs.forEach(
    g =>
      (options[g] = {
        caption: (
          <BodyPartIcon
            icon={{ glyph: g, color: '#000000', backgroundColor: '#ffffff' }}
            size="lg"
          />
        )
      })
  );
  return <ShrinkSelect options={options} {...props} />;
};

const iconProperties = [
  { key: 'glyph', caption: 'Image', editor: GlyphPicker },
  { key: 'color', caption: 'Color', editor: ColorPicker },
  { key: 'backgroundColor', caption: 'Background', editor: ColorPicker }
];

const IconEditor = props => (
  <PropertyEditor properties={iconProperties} {...props} />
);

export default IconEditor;
