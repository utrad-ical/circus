import React from 'react';
import type { CSSProperties } from 'react';
import { useCsResults } from '@utrad-ical/circus-ui-kit';
import type { Display } from '@utrad-ical/circus-ui-kit';
import styles from './Dump.module.css';

interface DumpOptions {
  /**
   * Maximum height of the text box in pixels.
   */
  maxHeight?: number;
}

/**
 * This is a simple "display" of CIRCUS CS that displays plug-in results
 * in text format.
 * You can use this to investigate the raw output of plug-in results.
 */
export const Dump: Display<DumpOptions, void> = props => {
  const { options } = props;
  const { maxHeight = 300 } = options;
  const { job } = useCsResults();
  // This contains the output data from the plug-in
  const { results } = job;

  return (
    <pre
      className={styles.pre}
      style={{ '--dump-max-height': `${maxHeight}px` } as CSSProperties}
    >
      {JSON.stringify(results, null, '  ')}
    </pre>
  );
};
