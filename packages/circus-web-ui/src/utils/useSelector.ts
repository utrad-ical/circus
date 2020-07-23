import { RootState } from '../store';
import { useSelector as useRawSelector } from 'react-redux';

/**
 * Type-safe version of useSelector.
 * @param selector The selector function.
 * @param equalityFn
 */
export const useSelector = <T>(
  selector: (state: RootState) => T,
  equalityFn?: (left: T, right: T) => boolean
) => {
  return useRawSelector<RootState, T>(selector, equalityFn);
};
