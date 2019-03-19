import React, { useReducer, Fragment } from 'react';
import Moment from 'moment';

const registeredMessage = feedback => {
  const m = new Moment(feedback.createdAt);
  const modeStr = feedback.isConsensual ? 'Consensual' : 'Personal';
  return (
    <Fragment>
      {modeStr} feedback registered{' '}
      <span title={m.format()}>{m.fromNow()}</span>
    </Fragment>
  );
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'reset': {
      // Choose which feedback to show or edit according to the following rule:
      const state = {
        isConsensual: false,
        currentData: {},
        registeredTargetCount: 0,
        canRegister: false,
        disabled: true,
        message: '',
        feedbacks: action.feedbacks,
        myUserEmail: action.myUserEmail
      };
      const consensual = action.feedbacks.find(f => f.consensual);
      const myPersonal = action.feedbacks.find(
        f => !f.consensual && f.enteredBy === action.myUserEmail
      );
      // 1. If consensual feedback is registered, show it
      if (consensual) {
        return {
          ...state,
          isConsensual: true,
          currentData: consensual.data,
          message: registeredMessage(consensual)
        };
      }
      // 2. If current user's personal feedback has been registered, show it
      if (myPersonal) {
        return {
          ...state,
          currentData: myPersonal.data,
          message: registeredMessage(myPersonal)
        };
      }
      // 3. Otherwise, enter personal mode and show empty feedback
      return { ...state, disabled: false };
    }
    case 'changeFeedback':
      return {
        ...state,
        currentData: action.value,
        registeredTargetCount: action.registeredTargetCount,
        canRegister: action.canRegister
      };
    case 'enterConsensualMode': {
      const consensual = state.feedbacks.find(f => f.consensual);
      return {
        ...state,
        isConsensual: true,
        disabled: !!consensual,
        canRegister: action.canRegister,
        registeredTargetCount: action.registeredTargetCount,
        currentData: consensual ? consensual.data : action.value,
        message: consensual ? registeredMessage(consensual) : ''
      };
    }
    case 'enterPersonalMode': {
      const myPersonal = state.feedbacks.find(
        f => !f.consensual && f.enteredBy === state.myUserEmail
      );
      return {
        ...state,
        isConsensual: false,
        disabled: !!myPersonal,
        canRegister: false,
        currentData: myPersonal ? myPersonal.data : {},
        message: myPersonal ? registeredMessage(myPersonal) : ''
      };
    }
  }
};

const useFeedback = () => {
  return useReducer(reducer);
};

export default useFeedback;
