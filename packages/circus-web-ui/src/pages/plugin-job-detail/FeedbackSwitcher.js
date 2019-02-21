import React, { useState } from 'react';
import { ButtonGroup } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { alert } from 'rb/modal';

const PersonalConsensualSwitch = props => {
  const { mode, onModeChange } = props;
  const isConsensual = mode === 'consensual';
  return (
    <ButtonGroup>
      <IconButton
        icon="user"
        bsStyle={isConsensual ? 'default' : 'primary'}
        active={!isConsensual}
        onClick={() => onModeChange('personal')}
      >
        Personal Mode
      </IconButton>
      <IconButton
        icon="tower"
        bsStyle={isConsensual ? 'primary' : 'default'}
        active={isConsensual}
        onClick={() => onModeChange('consensual')}
      >
        Consensual Mode
      </IconButton>
    </ButtonGroup>
  );
};

/**
 * Choose which feedback to show or edit according to the following rule:
 * 1. If consensual feedback has been registered, use it
 * 2. If current user's personal feedback has been registered, use it
 */
const selectInitialFeedback = props => {
  const { job } = props;
  const consensual = job.feedbacks.find(f => f.consensual);
  if (consensual) return consensual.feedbackId;
  const myPersonal = job.feedbacks.find(
    f => !f.consensual && f.enteredBy === props.user.userEmail
  );
  if (myPersonal) return myPersonal.feedbackId;
  return null;
};

const FeedbackSwitcher = props => {
  const [isConsensual, setIsConsensual] = useState(false);
  const [status, setStatus] = useState('unsaved');
  const [editingFeedback, setEditingFeedback] = useState(['', '', '']);
  const [feedbackId, setFeedbackId] = useState(selectInitialFeedback(props));

  const handleModeChange = mode => {
    setIsConsensual(mode === 'consensual');
  };

  const handleRegisterClick = async () => {
    await alert(JSON.stringify(editingFeedback));
  };

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
        feedback={editingFeedback}
        onFeedbackChange={setEditingFeedback}
      />
      <div className="feedback-register-panel">
        <IconButton icon="save" onClick={handleRegisterClick}>
          Regsiter feedback
        </IconButton>
      </div>
    </div>
  );
};

export default FeedbackSwitcher;
