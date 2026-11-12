import React, { type CSSProperties, type FC } from 'react';
import Icon from './Icon.tsx';
import styles from './LoadingIndicator.module.css';

/**
 * A spinning icon. With `delay` (ms), it appears only when loading takes
 * longer than that, to avoid flickering on fast responses.
 */
const LoadingIndicator: FC<{ delay?: number; icon?: string }> = props => {
  const { delay = 0, icon = 'material-progress_activity' } = props;
  return (
    <span
      role="status"
      aria-label="Loading"
      className={styles.indicator}
      style={{ '--delay': `${delay}ms` } as CSSProperties}
    >
      <Icon icon={icon} />
    </span>
  );
};

export default LoadingIndicator;
