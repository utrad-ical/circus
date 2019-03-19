import React from 'react';
import LesionCandidates from './feedback-listeners/LesionCandidates';
import SelectionFeedbackListener from './feedback-listeners/SelectionFeedbackListener';

const map = {
  LesionCandidates,
  SelectionFeedbackListener
}; // This should support dynamic plugging in the future

/**
 * Make a new composable component from a string `type` and `options`.
 * The returned value should be memoized using React.useMemo().
 */
const createDynamicComponent = (type, options) => {
  const Component = map[type];
  if (!Component) throw new Error(`Component ${type} is not defined.`);
  return React.forwardRef((props, ref) => (
    <Component ref={ref} options={options} {...props} />
  ));
};

export default createDynamicComponent;
