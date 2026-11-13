import classnames from 'classnames';
import React, { type FC, type ReactNode } from 'react';
import styles from './ProgressBar.module.css';

/**
 * A progress bar. Without `value`, it shows an indeterminate progress.
 */
const ProgressBar: FC<{
  value?: number;
  max?: number;
  variant?: 'success' | 'danger';
  label?: ReactNode;
  className?: string;
}> = props => {
  const { value, max = 100, variant, label, className } = props;
  const ratio =
    value === undefined ? undefined : Math.min(Math.max(value / max, 0), 1);
  return (
    <div className={classnames(styles.progress, className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={typeof label === 'string' ? label : undefined}
        className={classnames(
          styles.track,
          variant && styles[variant],
          ratio === undefined && styles.indeterminate
        )}
      >
        <div
          className={styles.fill}
          style={ratio === undefined ? undefined : { width: `${ratio * 100}%` }}
        />
      </div>
      {label !== undefined && <span>{label}</span>}
    </div>
  );
};

export default ProgressBar;
