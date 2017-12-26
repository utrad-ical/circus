import React from 'react';
import MultiSelect from 'rb/MultiSelect';
import PhysicalTag from './PhysicalTag';

const MultiTagSelect = props => {
  const { tags } = props;

  const options = {};
  tags.forEach(tag => {
    options[tag.name] = { caption: <PhysicalTag {...tag} /> };
  });

  return <MultiSelect {...props} options={options} />;
};

export default MultiTagSelect;
