import React from 'react';
import ColorPicker from '@smikitky/rb-components/lib/ColorPicker';
import { PhysicalTag } from 'components/Tag';

interface Tag {
  name: string;
  color: string;
}

export const newTagItem = (items: Tag[]) => {
  let num = 0;
  const name = (num: number) => 'Untitled' + (num === 0 ? '' : num);
  for (;;) {
    if (!items.some(item => name(num) === item.name)) break;
    num++;
  }
  return { name: name(num), color: '#ff8888' };
};

const TagEditor: React.FC<{
  value: Tag;
  onChange: (newTag: Tag) => void;
}> = props => {
  const change = (key: string, newValue: any) => {
    const newPreset = { ...props.value, [key]: newValue };
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
        onChange={(col: string) => change('color', col)}
      />
      &emsp; Sample:{' '}
      <PhysicalTag name={props.value.name} color={props.value.color} />
    </span>
  );
};

export default TagEditor;
