import React from 'react';
import { connect } from 'react-redux';
import tinycolor from 'tinycolor2';

/**
 * Displays a tag with a color and a name.
 */
export const PhysicalTag = props => {
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

/**
 * Displays a tag with a project ID and a tag name.
 */
const TagView = props => {
  const { projectId, tag, user } = props;
  const project = user.accessibleProjects.find(p => p.projectId === projectId);
  const tagDef = project.project.tags.find(t => t.name === tag);
  const color = tagDef ? tagDef.color : '#ffffff';
  return <PhysicalTag color={color} name={tag} />;
};

const Tag = connect(state => {
  return { user: state.loginUser.data };
})(TagView);
export default Tag;
