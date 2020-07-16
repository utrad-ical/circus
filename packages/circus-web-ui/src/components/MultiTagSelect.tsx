import React from 'react';
import MultiSelect from '@smikitky/rb-components/lib/MultiSelect';
import { PhysicalTag } from './Tag';

const MultiTagSelect: React.FC<{
  tags: { name: string; color: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  bsSize: any;
  bsStyle: string;
}> = props => {
  const { value, onChange, tags, bsSize, bsStyle } = props;

  const options: any = {};
  tags.forEach(tag => {
    options[tag.name] = {
      caption: <PhysicalTag name={tag.name} color={tag.color} />
    };
  });

  return (
    <MultiSelect
      value={value}
      onChange={onChange}
      bsSize={bsSize}
      bsStyle={bsStyle}
      options={options}
    />
  );
};

export default MultiTagSelect;
