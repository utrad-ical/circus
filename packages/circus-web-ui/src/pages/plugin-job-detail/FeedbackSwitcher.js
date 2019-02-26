import React, { useContext } from 'react';
import IconButton from 'components/IconButton';
import Icon from 'components/Icon';
import { alert } from 'rb/modal';
import { api } from 'utils/api';
import styled from 'styled-components';
import FeedbackListenerContext from './FeedbackListenerContext';
import useFeedback from './useFeedback';

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
  const [feedbackState, feedbackDispatch] = useFeedback();

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
