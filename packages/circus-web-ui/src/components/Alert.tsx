import classnames from 'classnames';
import React, { type FC, type ReactNode } from 'react';
import styles from './Alert.module.css';
import Button from './Button.tsx';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

/**
 * A message box. Shows a close button if `onDismiss` is given.
 */
const Alert: FC<{
  variant?: AlertVariant;
  onDismiss?: () => void;
  className?: string;
  children: ReactNode;
}> = props => {
  const { variant = 'info', onDismiss, className, children } = props;
  return (
    <div
      role="alert"
      className={classnames(styles.alert, styles[variant], className)}
    >
      <div className={styles.content}>{children}</div>
      {onDismiss && (
        <Button
          variant="link"
          size="xsmall"
          className={styles.close}
          icon="material-close"
          title="Close"
          onClick={onDismiss}
        />
      )}
    </div>
  );
};

export default Alert;
