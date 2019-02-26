import React, { useReducer } from 'react';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';
import { alert } from 'rb/modal';
import { api } from 'utils/api';
import Moment from 'moment';
import update from 'immutability-helper';

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

const fromNow = date => new Moment(date).fromNow();

const reducer = (state, action) => {
  switch (action.type) {
    case 'initialize': {
      // Choose which feedback to show or edit according to the following rule:
      // 1. If consensual feedback is registered, show it
      const state = {
        isConsensual: false,
        editingData: {},
        canRegister: false,
        canEdit: false,
        message: '',
        myUserEmail: action.myUserEmail
      };
      const consensual = action.feedbacks.find(f => f.consensual);
      if (consensual) {
        return {
          ...state,
          isConsensual: true,
          editingData: consensual.data,
          message:
            'Consensual feedback registered ' + fromNow(consensual.craetedAt)
        };
      }
      // 2. If current user's personal feedback has been registered, show it
      const myPersonal = action.feedbacks.find(
        f => !f.consensual && f.enteredBy === action.userEmail
      );
      if (myPersonal) {
        return {
          ...state,
          editingData: myPersonal.data,
          message:
            'Personal feedback registered ' + fromNow(myPersonal.createdAt)
        };
      }
      // 3. Otherwise, enter personal mode and show empty feedback
      return {
        ...state,
        canEdit: true
      };
    }
    case 'changeFeedback':
      return update(state, { editingData: { $set: action.value } });
    case 'enterConsensualMode':
      return update(state, { isConsensual: { $set: true } });
    case 'enterPersonalMode':
      return update(state, { isConsensual: { $set: false } });
  }
};

const FeedbackSwitcher = props => {
  const { job } = props;
  const { jobId } = job;

  const [feedbackState, feedbackDispatch] = useReducer(reducer);
  if (!feedbackState) {
    feedbackDispatch({
      type: 'initialize',
      feedbacks: job.feedbacks,
      myUserEmail: props.userEmail
    });
    return;
  }

  const handleRegisterClick = async () => {
    await alert(JSON.stringify(feedbackState.editingData));
    const mode = feedbackState.isConsensual ? 'consensual' : 'personal';
    api(`plugin-jobs/${jobId}/feedback/${mode}`, {
      method: 'POST',
      data: feedbackState.editingData
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
      <div className="feedback-register-panel">
        {feedbackState.message && (
          <span className="feedback-regsiter-time">
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
      </div>
    </div>
  );
};

export default FeedbackSwitcher;
