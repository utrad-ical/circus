import React, { useReducer, Fragment } from 'react';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';
import { alert } from 'rb/modal';
import { api } from 'utils/api';
import styled from 'styled-components';
import Moment from 'moment';

const PersonalConsensualSwitch = props => {
  const { feedbackState: { isConsensual }, feedbackDispatch } = props;
  return (
    <div>
      <IconButton
        icon="user"
        bsStyle={isConsensual ? 'default' : 'primary'}
        active={!isConsensual}
        onClick={() => feedbackDispatch({ type: 'enterPersonalMode' })}
      >
        Personal Mode
      </IconButton>
      &ensp;
      <Icon icon="chevron-right" />
      &ensp;
      <IconButton
        icon="tower"
        bsStyle={isConsensual ? 'primary' : 'default'}
        active={isConsensual}
        onClick={() => feedbackDispatch({ type: 'enterConsensualMode' })}
      >
        Consensual Mode
      </IconButton>
    </div>
  );
};

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
        canRegister: false,
        canEdit: false,
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
      return { ...state, canEdit: true };
    }
    case 'changeFeedback':
      return { ...state, currentData: action.value };
    case 'enterConsensualMode': {
      const consensual = state.feedbacks.find(f => f.consensual);
      return {
        ...state,
        isConsensual: true,
        canEdit: !consensual,
        canRegister: false,
        currentData: consensual ? consensual.data : {},
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
        canEdit: !myPersonal,
        canRegister: false,
        currentData: myPersonal ? myPersonal.data : {},
        message: myPersonal ? registeredMessage(myPersonal) : ''
      };
    }
  }
};

const StyledDiv = styled.div`
  margin: 1em 0;
  text-align: right;
  .feedback-regsiter-message {
    margin-right: 1em;
  }
`;

const FeedbackSwitcher = props => {
  const { job } = props;
  const { jobId } = job;

  const [feedbackState, feedbackDispatch] = useReducer(reducer);
  if (!feedbackState) {
    feedbackDispatch({
      type: 'reset',
      feedbacks: job.feedbacks,
      myUserEmail: props.userEmail
    });
    return;
  }

  const handleRegisterClick = async () => {
    await alert(JSON.stringify(feedbackState.currentData));
    const mode = feedbackState.isConsensual ? 'consensual' : 'personal';
    api(`plugin-jobs/${jobId}/feedback/${mode}`, {
      method: 'POST',
      data: feedbackState.currentData
    });
  };

  const { jobRenderer: JobRenderer } = props;
  return (
    <div>
      <div className="feedback-mode-switch">
        <PersonalConsensualSwitch
          feedbackState={feedbackState}
          feedbackDispatch={feedbackDispatch}
        />
      </div>
      <JobRenderer
        {...props}
        feedbackState={feedbackState}
        feedbackDispatch={feedbackDispatch}
      />
      <StyledDiv>
        {feedbackState.message && (
          <span className="feedback-regsiter-message">
            {feedbackState.message}
          </span>
        )}
        <IconButton
          icon={feedbackState.isConsensual ? 'tower' : 'user'}
          disabled={!feedbackState.canRegister}
          onClick={handleRegisterClick}
        >
          Regsiter {feedbackState.isConsensual ? 'consensual' : 'personal'}{' '}
          feedback
        </IconButton>
      </StyledDiv>
    </div>
  );
};

export default FeedbackSwitcher;
