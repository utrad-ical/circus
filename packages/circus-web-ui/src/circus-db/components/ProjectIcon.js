import React from 'react';
import Icon from 'shared/components/Icon';
import classnames from 'classnames';

const ProjectIcon = props => {
  const { size, icon: { glyph, color, backgroundColor } } = props;
  const style = { color, backgroundColor };
  return (
    <span className={classnames('project-icon', size)} style={style}>
      <Icon icon={`circus-b-${glyph}`} />
    </span>
  );
};

export default ProjectIcon;
