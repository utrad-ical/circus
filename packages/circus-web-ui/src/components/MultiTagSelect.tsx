import React from 'react';
import MultiSelect from '#components/MultiSelect.tsx';
import { PhysicalTag } from './Tag.tsx';

const MultiTagSelect: React.FC<{
  tags: { name: string; color: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}> = props => {
  const { value, onChange, tags } = props;

  const options: any = {};
  tags.forEach(tag => {
    options[tag.name] = {
      caption: <PhysicalTag name={tag.name} color={tag.color} />
    };
  });

  return <MultiSelect value={value} onChange={onChange} options={options} />;
};

export default MultiTagSelect;
