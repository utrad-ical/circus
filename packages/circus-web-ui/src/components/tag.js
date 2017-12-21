import React from 'react';
import tinycolor from 'tinycolor2';

export const Tag = props => {
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

export const TagList = props => {
  return (
    <span className="tag-list">
      {props.tags.map(tag => (
        <Tag key={tag.name} name={tag.name} color={tag.color} />
      ))}
    </span>
  );
};
