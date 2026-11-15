import classnames from 'classnames';
import React, { type FC } from 'react';
import type { Progress } from '#utils/useProgress.ts';
import ProgressBar from './ProgressBar.tsx';
import styles from './ProgressView.module.css';

/**
 * Shows a progress bar and its message.
 */
const ProgressView: FC<{
  progress: Progress | undefined;
  /** Shown before the progress starts */
  placeholder?: string;
}> = props => {
  const { progress, placeholder = 'Not started' } = props;
  const { status, finished, total, message } = progress ?? {};
  return (
    <div className={styles.progressView}>
      <ProgressBar
        variant={
          status === 'error'
            ? 'danger'
            : status === 'finished'
              ? 'success'
              : undefined
        }
        value={
          !progress ? 0 : status === 'processing' ? finished : (total ?? 100)
        }
        max={total ?? 100}
      />
      <div
        className={classnames(styles.message, {
          [styles.muted]: !progress,
          [styles.danger]: status === 'error',
          [styles.success]: status === 'finished'
        })}
      >
        {message ?? placeholder}
      </div>
    </div>
  );
};

export default ProgressView;
