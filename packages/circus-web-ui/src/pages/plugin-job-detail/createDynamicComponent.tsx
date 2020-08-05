import React from 'react';
import LesionCandidates from './feedback-listeners/LesionCandidates';
import SelectionFeedbackListener from './feedback-listeners/SelectionFeedbackListener';
import Locator from './feedback-listeners/Locator';
import FatVolumetry from './feedback-listeners/FatVolumetry';

const map: { [key: string]: any } = {
  LesionCandidates,
  SelectionFeedbackListener,
  Locator,
  FatVolumetry
}; // This should support dynamic plugging in the future

/**
 * Make a new composable component from a string `type` and `options`.
 * The returned value should be memoized using React.useMemo().
 */
const createDynamicComponent = (type: string, options: any) => {
  const Component = map[type];
  if (!Component) throw new Error(`Component ${type} is not defined.`);
  return React.forwardRef<any, any>((props, ref) => (
    <Component ref={ref} options={options} {...props} />
  ));
};

export default createDynamicComponent;
