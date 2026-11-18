import React from 'react';
import Icon from './Icon.tsx';
import classnames from 'classnames';
import type { IconDefinition } from '@utrad-ical/circus-api-schema';
import styles from './BodyPartIcon.module.css';

/**
 * Renderes a body-part icon with the specified color and backgroundColor.
 */
const BodyPartIcon: React.FC<{
  size?: string;
  icon: IconDefinition;
}> = props => {
  const {
    size,
    icon: { glyph, color, backgroundColor }
  } = props;
  const style = { color, backgroundColor };
  return (
    <span
      className={classnames(styles.bodyPartIcon, size && styles[size])}
      style={style}
    >
      <Icon icon={`circus-b-${glyph}`} />
    </span>
  );
};

export default BodyPartIcon;
