import React from 'react';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import styled from 'styled-components';

interface DumpOptions {
  /**
   * Maximum height of the text box in pixels.
   */
  maxHeight: number;
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
    <StyledPre maxHeight={maxHeight}>
      {JSON.stringify(results, null, '  ')}
    </StyledPre>
  );
};

const StyledPre = styled.pre`
  max-height: ${(props: any) => `${props.maxHeight}px`};
`;
