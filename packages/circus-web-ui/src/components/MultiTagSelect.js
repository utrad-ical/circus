import React from 'react';
import MultiSelect from 'rb/MultiSelect';
import { Tag } from './tag';

const MultiTagSelect = props => {
  const { tags } = props;

  const options = {};
  tags.forEach(tag => {
    options[tag.name] = { caption: <Tag {...tag} /> };
  });

  return <MultiSelect {...props} options={options} />;
};

export default MultiTagSelect;
