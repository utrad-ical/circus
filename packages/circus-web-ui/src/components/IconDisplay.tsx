import classnames from 'classnames';
import React from 'react';
import type { CircusIconDefinition } from './BodyPartIcon.tsx';
import BodyPartIcon from './BodyPartIcon.tsx';
import Tooltip from './Tooltip.tsx';
import styles from './IconDisplay.module.css';

const IconDisplay: React.FC<{
  size?: string;
  icon: CircusIconDefinition;
  title: React.ReactNode;
  description?: React.ReactNode;
  toolTip?: React.ReactChild;
}> = props => {
  const { size, icon, title, description, toolTip } = props;

  const content = (
    <span className={classnames('icon-display', styles.iconDisplay)}>
      <BodyPartIcon icon={icon} size={size} />
      <div className={styles.name}>
        {title && <div className={styles.title}>{title}</div>}
        {description && (
          <div className={styles.description}> {description}</div>
        )}
      </div>
    </span>
  );

  return toolTip ? <Tooltip content={toolTip}>{content}</Tooltip> : content;
};

export default IconDisplay;
