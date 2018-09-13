import React from 'react';
import Icon from './Icon';
import classnames from 'classnames';

/**
 * Renderes a body-part icon with the specified color and backgroundColor.
 */
const BodyPartIcon = props => {
  const { size, icon: { glyph, color, backgroundColor } } = props;
  const style = { color, backgroundColor };
  return (
    <span className={classnames('body-part-icon', size)} style={style}>
      <Icon icon={`circus-b-${glyph}`} />
    </span>
  );
};

export default BodyPartIcon;
