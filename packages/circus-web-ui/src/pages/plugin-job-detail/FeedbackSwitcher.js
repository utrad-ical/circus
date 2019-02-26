import React, { useState } from 'react';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';
import { alert } from 'rb/modal';
import { api } from 'utils/api';
import Moment from 'moment';

const PersonalConsensualSwitch = props => {
  const { mode, onModeChange } = props;
  const isConsensual = mode === 'consensual';
  return (
    <div>
      <IconButton
        icon="user"
        bsStyle={isConsensual ? 'default' : 'primary'}
        active={!isConsensual}
        onClick={() => onModeChange('personal')}
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
        onClick={() => onModeChange('consensual')}
      >
        Consensual Mode
      </IconButton>
    </div>
  );
};

const FeedbackSwitcher = props => {
  const { job: { jobId } } = props;

  const handleModeChange = mode => {
    setIsConsensual(mode === 'consensual');
  };

  /**
   * Choose which feedback to show or edit according to the following rule:
   * 1. If consensual feedback is registered, show it
   * 2. If current user's personal feedback has been registered, show it
   */
  const selectShowingFeedback = () => {
    const { job } = props;
    const consensual = job.feedbacks.find(f => f.consensual);
    if (consensual) return consensual;
    const myPersonal = job.feedbacks.find(
      f => !f.consensual && f.enteredBy === props.userEmail
    );
    if (myPersonal) return myPersonal;
  };

  const showingFeedback = selectShowingFeedback();

  const [isConsensual, setIsConsensual] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(
    showingFeedback ? showingFeedback.data : {}
  );

  const handleRegisterClick = async () => {
    await alert(JSON.stringify(editingFeedback));
    const mode = isConsensual ? 'consensual' : 'personal';
    api(`plugin-jobs/${jobId}/feedback/${mode}`, {
      method: 'POST',
      data: editingFeedback
    });
  };

  const canEditFeedback = !showingFeedback;
  const canRegister = !showingFeedback;

  const { jobRenderer: JobRenderer } = props;
  return (
    <div>
      <div className="feedback-mode-switch">
        <PersonalConsensualSwitch
          mode={isConsensual ? 'consensual' : 'personal'}
          onModeChange={handleModeChange}
        />
      </div>
      <JobRenderer
        {...props}
        isConsensual={isConsensual}
        canEditFeedback={canEditFeedback}
        feedback={editingFeedback}
        onFeedbackChange={setEditingFeedback}
      />
      <div className="feedback-register-panel">
        {showingFeedback && (
          <span
            className="feedback-regsiter-time"
            title={new Moment(showingFeedback.craetedAt).format('Y-m-d H:i:s')}
          >
            Registered: {new Moment(showingFeedback.createdAt).fromNow()}
          </span>
        )}
        <IconButton
          icon={isConsensual ? 'tower' : 'user'}
          disabled={!canRegister}
          onClick={handleRegisterClick}
        >
          Regsiter {isConsensual ? 'consensual' : 'personal'} feedback
        </IconButton>
      </div>
    </div>
  );
};

export default FeedbackSwitcher;
