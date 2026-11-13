import classnames from 'classnames';
import React from 'react';
import tinycolor from 'tinycolor2';
import useLoginUser from '#utils/useLoginUser.ts';
import styles from './Tag.module.css';

/**
 * Displays a tag with a color and a name.
 */
export const PhysicalTag: React.FC<{
  name: string;
  color: string;
}> = React.memo(props => {
  const color = props.color || '#f00';
  const style = {
    '--tag-background-color': tinycolor(color).toHexString(),
    '--tag-color': tinycolor
      .mostReadable(color, ['#000', '#fff'])
      .toHexString(),
    '--tag-border-color': tinycolor(color).darken().toHexString()
  } as React.CSSProperties;
  return (
    <span className={classnames('tag', styles.tag)} style={style}>
      {props.name}
    </span>
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
    ? (project.project.tags.find(t => t.name === tag)?.color ?? defaultTagColor)
    : defaultTagColor;
  return <PhysicalTag color={color} name={tag} />;
});

export const TagList: React.FC<{
  projectId: string;
  tags: string[];
}> = React.memo(props => {
  const user = useLoginUser()!;
  const { projectId, tags } = props;
  const project = user.accessibleProjects.find(p => p.projectId === projectId);
  return (
    <span className={styles.tagList}>
      {tags.map(tag => {
        const color = project
          ? (project.project.tags.find(t => t.name === tag)?.color ??
            defaultTagColor)
          : defaultTagColor;
        return <PhysicalTag key={tag} name={tag} color={color} />;
      })}
    </span>
  );
});

export default Tag;
