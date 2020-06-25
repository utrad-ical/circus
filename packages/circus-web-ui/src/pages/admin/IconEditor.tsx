import React, { useMemo } from 'react';
import BodyPartIcon from 'components/BodyPartIcon';
import PropertyEditor from '@smikitky/rb-components/lib/PropertyEditor';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import ColorPicker from '@smikitky/rb-components/lib/ColorPicker';

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

const GlyphPicker: React.FC<any> = props => {
  const options = useMemo(() => {
    const o: any = {};
    glyphs.forEach(
      glyph =>
        (o[glyph] = {
          caption: (
            <BodyPartIcon
              icon={{ glyph, color: '#000000', backgroundColor: '#ffffff' }}
              size="lg"
            />
          )
        })
    );
    return o;
  }, []);
  return <ShrinkSelect options={options} {...props} />;
};

const iconProperties = [
  { key: 'glyph', caption: 'Image', editor: GlyphPicker },
  { key: 'color', caption: 'Color', editor: ColorPicker },
  { key: 'backgroundColor', caption: 'Background', editor: ColorPicker }
];

const IconEditor: React.FC<any> = props => (
  <PropertyEditor properties={iconProperties} {...props} />
);

export default IconEditor;
