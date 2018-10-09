import React from 'react';
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

export default class FeedbackSwitcher extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isConsensual: false,
      status: 'unsaved',
      editingFeedback: ['', '', ''],
      feedbackId: this.selectInitialFeedback(props)
    };
  }

  selectInitialFeedback = props => {
    const { job } = props;
    // Choose which feedback to show or edit according to the following rule:
    // 1. If consensual feedback has been registered, use it
    // 2. If current user's personal feedback has been registered, use it
    const consensual = job.feedbacks.find(f => f.consensual);
    if (consensual) return consensual.feedbackId;
    const myPersonal = job.feedbacks.find(
      f => !f.consensual && f.enteredBy === props.user.userEmail
    );
    if (myPersonal) return myPersonal.feedbackId;
    return null;
  };

  handleFeedbackChange = feedback => {
    this.setState({ editingFeedback: feedback });
  };

  handleModeChange = mode => {
    this.setState({ isConsensual: mode === 'consensual' });
  };

  handleRegisterClick = async () => {
    const { editingFeedback } = this.state;
    await alert(JSON.stringify(editingFeedback));
  };

  render() {
    const { jobRenderer: JobRenderer } = this.props;
    const { isConsensual, editingFeedback } = this.state;
    return (
      <div>
        <div className="feedback-mode-switch">
          <PersonalConsensualSwitch
            mode={isConsensual ? 'consensual' : 'personal'}
            onModeChange={this.handleModeChange}
          />
        </div>
        <JobRenderer
          {...this.props}
          feedback={editingFeedback}
          onFeedbackChange={this.handleFeedbackChange}
        />
        <div className="feedback-register-panel">
          <IconButton icon="save" onClick={this.handleRegisterClick}>
            Regsiter feedback
          </IconButton>
        </div>
      </div>
    );
  }
}
