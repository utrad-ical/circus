import React from 'react';
import { connect } from 'react-redux';
import tinycolor from 'tinycolor2';
import styled from 'styled-components';

const StyledSpan = styled.span`
  display: inline-block;
  text-align: center;
  padding: 0 5px;
  border-radius: 5px;
  border-style: solid;
  border-width: 1px;
  font-weight: bold;
  min-width: 70px;
  background-color: ${props => {
    return tinycolor(props.color || '#f00').toHexString();
  }};
  color: ${props => {
    return tinycolor
      .mostReadable(props.color || '#f00', ['#000', '#fff'])
      .toHexString();
  }};
  border-color: ${props => {
    return tinycolor(props.color || '#f00')
      .darken()
      .toHexString();
  }};
`;

/**
 * Displays a tag with a color and a name.
 */
export const PhysicalTag = props => {
  return <StyledSpan {...props}>{props.name}</StyledSpan>;
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
