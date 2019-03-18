import React from 'react';
import styled from 'styled-components';

const createFnInputFeedbackListener = options => {
  const FnInputFeedbackListener = props => {
    const { onChange, isConsensual, value, disabled } = props;
    return <div>{JSON.stringify(value)}</div>;
  };

  const createInitialConsensualFeedback = personalFeedbackData => {};
  FnInputFeedbackListener.createInitialConsensualFeedback = createInitialConsensualFeedback;

  return FnInputFeedbackListener;
};

export default createFnInputFeedbackListener;
