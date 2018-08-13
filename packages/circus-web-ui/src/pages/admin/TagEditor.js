import React from 'react';
import ColorPicker from 'rb/ColorPicker';
import { PhysicalTag } from 'components/Tag';

const TagEditor = props => {
  const change = (key, newValue) => {
    const newPreset = { ...props.value };
    newPreset[key] = newValue;
    props.onChange && props.onChange(newPreset);
  };

  return (
    <span className="form-inline">
      <input
        className="form-control"
        value={props.value.name}
        placeholder="Name"
        onChange={ev => change('name', ev.target.value)}
      />
      &emsp;
      <ColorPicker
        value={props.value.color}
        showColorCode={true}
        onChange={col => change('color', col)}
      />
      &emsp; Sample:{' '}
      <PhysicalTag name={props.value.name} color={props.value.color} />
    </span>
  );
};

export default TagEditor;

export const newTagItem = items => {
  let num = 0;
  const name = num => 'Untitled' + (num === 0 ? '' : num);
  for (;;) {
    if (!items.some(item => name(num) === item.name)) break;
    num++;
  }
  return { name: name(num), color: '#ff8888' };
};
