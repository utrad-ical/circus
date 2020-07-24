import React from 'react';
import tinycolor from 'tinycolor2';
import styled from 'styled-components';
import useLoginUser from 'utils/useLoginUser';

const StyledSpan = styled.span`
  display: inline-block;
  text-align: center;
  padding: 0 5px;
  border-radius: 5px;
  border-style: solid;
  border-width: 1px;
  font-weight: bold;
  min-width: 70px;
  background-color: ${(props: any) => {
    return tinycolor(props.color || '#f00').toHexString();
  }};
  color: ${(props: any) => {
    return tinycolor
      .mostReadable(props.color || '#f00', ['#000', '#fff'])
      .toHexString();
  }};
  border-color: ${(props: any) => {
    return tinycolor(props.color || '#f00')
      .darken()
      .toHexString();
  }};
`;

/**
 * Displays a tag with a color and a name.
 */
export const PhysicalTag: React.FC<{
  name: string;
  color: string;
}> = React.memo(props => {
  return (
    <StyledSpan className="tag" color={props.color}>
      {props.name}
    </StyledSpan>
  );
});

const defaultTagColor = '#ffffff';

/**
 * Displays a tag with a project ID and a tag name.
 */
const Tag: React.FC<{
  projectId: string;
  tag: string;
}> = React.memo(props => {
  const user = useLoginUser()!;
  const { projectId, tag } = props;
  const project = user.accessibleProjects.find(p => p.projectId === projectId);
  const color = project
    ? project.project.tags.find(t => t.name === tag)?.color ?? defaultTagColor
    : defaultTagColor;
  return <PhysicalTag color={color} name={tag} />;
});

const StyledTagListSpan = styled.span`
  .tag {
    margin-left: 2px;
    margin-right: 2px;
  }
`;

export const TagList: React.FC<{
  projectId: string;
  tags: string[];
}> = React.memo(props => {
  const user = useLoginUser()!;
  const { projectId, tags } = props;
  const project = user.accessibleProjects.find(p => p.projectId === projectId);
  return (
    <StyledTagListSpan>
      {tags.map(tag => {
        const color = project
          ? project.project.tags.find(t => t.name === tag)?.color ??
            defaultTagColor
          : defaultTagColor;
        return <PhysicalTag key={tag} name={tag} color={color} />;
      })}
    </StyledTagListSpan>
  );
});

export default Tag;
