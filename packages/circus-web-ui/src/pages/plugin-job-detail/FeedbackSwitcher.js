import React from 'react';
import { ButtonGroup } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';

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
    const consensual = job.feedback.find(f => f.consensual);
    if (consensual) return consensual.feedbackId;
    const myPersonal = job.feedback.find(
      f => !f.consensual && f.enteredBy === props.user.userEmail
    );
    if (myPersonal) return myPersonal.feedbackId;
    return null;
  };

  handleFeedbackChange = feedback => {
    this.setState({ editingFeedback: feedback });
  };

  handlePersonalModeClick = () => {
    this.setState({ isConsensual: false });
  };

  handleConsensualModeClick = () => {
    this.setState({ isConsensual: true });
  };

  render() {
    const { jobRenderer: JobRenderer } = this.props;
    const { isConsensual, editingFeedback } = this.state;
    return (
      <div>
        <ButtonGroup>
          <IconButton
            icon="user"
            bsStyle={isConsensual ? 'default' : 'primary'}
            active={!isConsensual}
            onClick={this.handlePersonalModeClick}
          >
            Personal
          </IconButton>
          <IconButton
            icon="tower"
            bsStyle={isConsensual ? 'primary' : 'default'}
            active={isConsensual}
            onClick={this.handleConsensualModeClick}
          >
            Consensual
          </IconButton>
        </ButtonGroup>
        <JobRenderer
          {...this.props}
          feedback={editingFeedback}
          onFeedbackChange={this.handleFeedbackChange}
        />
      </div>
    );
  }
}
