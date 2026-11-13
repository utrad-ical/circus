import React from 'react';
import Icon from './Icon.tsx';
import classnames from 'classnames';
import styles from './BodyPartIcon.module.css';

export interface CircusIconDefinition {
  glyph: string;
  color: string;
  backgroundColor: string;
}

/**
 * Renderes a body-part icon with the specified color and backgroundColor.
 */
const BodyPartIcon: React.FC<{
  size?: string;
  icon: CircusIconDefinition;
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
