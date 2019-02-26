import React, { useReducer, Fragment, useContext } from 'react';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';
import { alert } from 'rb/modal';
import { api } from 'utils/api';
import styled from 'styled-components';
import Moment from 'moment';
import FeedbackListenerContext from './FeedbackListenerContext';

const PersonalConsensualSwitch = props => {
  const { feedbackState: { isConsensual }, onChange } = props;
  return (
    <div>
      <IconButton
        icon="user"
        bsStyle={isConsensual ? 'default' : 'primary'}
        active={!isConsensual}
        onClick={() => onChange(false)}
      >
        Personal Mode
      </IconButton>
      &thinsp;
      <Icon icon="chevron-right" />
      &thinsp;
      <IconButton
        icon="tower"
        bsStyle={isConsensual ? 'primary' : 'default'}
        active={isConsensual}
        onClick={() => onChange(true)}
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
        canEdit: !myPersonal,
        canRegister: false,
        currentData: myPersonal ? myPersonal.data : {},
        message: myPersonal ? registeredMessage(myPersonal) : ''
      };
    }
  }
};

const StyledDiv = styled.div`
  .feedback-mode-switch {
    margin: 0.5em 0;
  }
  .feedback-nav {
    margin: 1em 0;
    text-align: right;
    .regsiter-message {
      margin-right: 1em;
    }
  }
`;

const FeedbackSwitcher = props => {
  const { job, seriesData, jobRenderer: JobRenderer } = props;
  const { jobId } = job;

  const feedbackListener = useContext(FeedbackListenerContext);
  const [feedbackState, feedbackDispatch] = useReducer(reducer);

  if (!feedbackState) {
    feedbackDispatch({
      type: 'reset',
      feedbacks: job.feedbacks,
      myUserEmail: props.userEmail,
      createInitialConsensualFeedback:
        feedbackListener.createInitialConsensualFeedback
    });
    return;
  }

  const handleChangeFeedbackMode = isConsensual => {
    if (isConsensual) {
      feedbackDispatch({
        type: 'enterConsensualMode',
        value: {
          lesionCandidates: feedbackListener.createInitialConsensualFeedback(
            job.feedbacks
              .filter(f => !f.isConsensual)
              .map(f => f.data.lesionCandidates) // TODO: fixme
          )
        }
      });
    } else {
      feedbackDispatch({ type: 'enterPersonalMode' });
    }
  };

  const handleRegisterClick = async () => {
    await alert(JSON.stringify(feedbackState.currentData));
    const mode = feedbackState.isConsensual ? 'consensual' : 'personal';
    api(`plugin-jobs/${jobId}/feedback/${mode}`, {
      method: 'POST',
      data: feedbackState.currentData
    });
  };

  const modeText = feedbackState.isConsensual ? 'consensual' : 'personal';

  return (
    <StyledDiv>
      <div className="feedback-mode-switch">
        <PersonalConsensualSwitch
          feedbackState={feedbackState}
          onChange={handleChangeFeedbackMode}
        />
      </div>
      <JobRenderer
        job={job}
        seriesData={seriesData}
        feedbackState={feedbackState}
        feedbackDispatch={feedbackDispatch}
      />
      <div className="feedback-nav">
        {feedbackState.message && (
          <span className="regsiter-message">{feedbackState.message}</span>
        )}
        <IconButton
          icon={feedbackState.isConsensual ? 'tower' : 'user'}
          disabled={!feedbackState.canRegister}
          onClick={handleRegisterClick}
        >
          Regsiter {modeText} feedback
        </IconButton>
      </div>
    </StyledDiv>
  );
};

export default FeedbackSwitcher;
