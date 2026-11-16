import classnames from 'classnames';
import React, { useLayoutEffect, useRef, type FC } from 'react';
import type { LogLine } from '#utils/useProgress.ts';
import styles from './LogPane.module.css';

/**
 * Shows log lines in a small box, which follows the latest line
 * unless the user has scrolled up.
 */
const LogPane: FC<{ lines: LogLine[] }> = props => {
  const { lines } = props;
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useLayoutEffect(() => {
    const div = ref.current;
    if (div && stick.current) div.scrollTop = div.scrollHeight;
  }, [lines]);

  const handleScroll = () => {
    const div = ref.current!;
    stick.current = div.scrollTop + div.clientHeight >= div.scrollHeight - 2;
  };

  if (!lines.length) return null;
  return (
    <div ref={ref} className={styles.logPane} onScroll={handleScroll}>
      {lines.map((line, i) => (
        <div key={i} className={classnames(styles.line, styles[line.level])}>
          {line.message}
        </div>
      ))}
    </div>
  );
};

export default LogPane;
