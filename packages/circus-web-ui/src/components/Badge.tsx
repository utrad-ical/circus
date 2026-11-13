import classnames from 'classnames';
import React, { type FC, type ReactNode } from 'react';
import styles from './Badge.module.css';

/**
 * A small label like a tag, e.g., a group name.
 */
const Badge: FC<{
  variant?: 'default' | 'primary' | 'danger';
  className?: string;
  children: ReactNode;
}> = props => {
  const { variant = 'default', className, children } = props;
  return (
    <span className={classnames(styles.badge, styles[variant], className)}>
      {children}
    </span>
  );
};

export default Badge;
