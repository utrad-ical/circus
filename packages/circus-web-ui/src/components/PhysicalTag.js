import React from 'react';
import tinycolor from 'tinycolor2';

const PhysicalTag = props => {
  const tagColor = props.color || '#f00';
  const backgroundColor = tinycolor(tagColor).toHexString();
  const color = tinycolor
    .mostReadable(backgroundColor, ['#000', '#fff'])
    .toHexString();
  const borderColor = tinycolor(tagColor)
    .darken()
    .toHexString();
  const style = { color, backgroundColor, borderColor };
  return (
    <span className="tag" style={style}>
      {props.name}
    </span>
  );
};

export default PhysicalTag;

export const TagList = props => {
  return (
    <span className="tag-list">
      {props.tags.map(tag => (
        <PhysicalTag key={tag.name} name={tag.name} color={tag.color} />
      ))}
    </span>
  );
};
