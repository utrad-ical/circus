import React, { useMemo, useCallback } from 'react';
import { useApi } from 'utils/api';
import PatientInfoBox from 'components/PatientInfoBox';
import FullSpanContainer from 'components/FullSpanContainer';
import LoadingIndicator from 'rb/LoadingIndicator';
import LesionCandidates from './LesionCandidates';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';
import createSelectionFeedbackListener from './feedback-listeners/createSelectionFeedbackListener';
import styled from 'styled-components';
import useFeedback from './useFeedback';
import PersonalConsensualSwitch from './PersonalConsensualSwitch';
import useLoadData from 'utils/useLoadData';
import PieProgress from 'components/PieProgress';

const StyledDiv = styled.div`
  .job-main {
    padding: 10px;
  }
  .job-detail-header {
    flex: none;
    padding: 5px 10px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid silver;
  }
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

const displayStrategy = [
  {
    feedbackKey: 'lesionCandidates',
    type: 'LesionCandidates',
    options: {
      feedbackListener: {
        type: 'SelectionFeedbackListener',
        options: {
          personal: [
            { caption: 'known TP', value: 1 },
            { caption: 'missed TP', value: 2, consensualMapsTo: 1 },
            { caption: 'FP', value: -1 },
            { caption: 'pending', value: 0 }
          ],
          consensual: [
            { caption: 'TP', value: 1 },
            { caption: 'FP', value: -1 },
            { caption: 'pending', value: 0 }
          ]
        }
      }
    }
  }
  // { type: "FnInput", ... }
];

const createLesionCandidates = options => {
  const { feedbackListener } = options;
  const listener = createSelectionFeedbackListener(feedbackListener.options);
  return {
    render: props => (
      <LesionCandidates feedbackListener={listener} {...props} />
    ),
    createInitialConsensualFeedback: listener.createInitialConsensualFeedback
  };
};

const createFeedbackTargets = () => {
  const feedbackTargets = [];
  for (const strategy of displayStrategy) {
    switch (strategy.type) {
      case 'LesionCandidates': {
        const lesionCandidates = createLesionCandidates(strategy.options);
        feedbackTargets.push({
          feedbackKey: strategy.feedbackKey,
          validate: feedback => Array.isArray(feedback) && feedback.length >= 3,
          render: lesionCandidates.render,
          createInitialConsensualFeedback:
            lesionCandidates.createInitialConsensualFeedback
        });
      }
    }
  }
  return feedbackTargets;
};

const PluginJobDetail = props => {
  const api = useApi();
  const jobId = props.match.params.jobId;

  const loadJob = useCallback(
    async () => {
      const job = await api(`plugin-jobs/${jobId}`);
      const seriesData = {};
      for (const s of job.series) {
        const seriesUid = s.seriesUid;
        if (seriesUid in seriesData) continue;
        seriesData[seriesUid] = await api(`series/${seriesUid}`);
      }
      return { job, seriesData };
    },
    [api, jobId]
  );

  const [jobData, , reloadJob] = useLoadData(loadJob);

  const feedbackTargets = useMemo(() => createFeedbackTargets(), []);
  const [feedbackState, dispatch] = useFeedback();

  if (!jobData) {
    return <LoadingIndicator />;
  }

  if (jobData instanceof Error) {
    return <div className="alert alert-danger">{jobData.message}</div>;
  }

  const { job, seriesData } = jobData;
  const primarySeriesUid = job.series[0].seriesUid;

  if (!feedbackState) {
    dispatch({
      type: 'reset',
      feedbacks: job.feedbacks,
      myUserEmail: props.userEmail
    });
    return;
  }

  const handleChange = (feedbackKey, value) => {
    dispatch({
      type: 'changeFeedback',
      key: feedbackKey,
      value,
      valid: feedbackTargets.every(t => {
        return t.validate(
          feedbackKey === t.feedbackKey
            ? value
            : feedbackState.currentData[t.feedbackKey]
        );
      })
    });
  };

  const handleChangeFeedbackMode = isConsensual => {
    if (isConsensual) {
      const value = {};
      feedbackTargets.forEach(t => {
        const pfbs = job.feedbacks
          .filter(f => !f.isConsensual)
          .map(f => f.data[t.feedbackKey]);
        value[t.feedbackKey] = t.createInitialConsensualFeedback(pfbs);
      });
      dispatch({ type: 'enterConsensualMode', value });
    } else {
      dispatch({ type: 'enterPersonalMode' });
    }
  };

  const handleRegisterClick = async () => {
    await alert(JSON.stringify(feedbackState.currentData));
    const mode = feedbackState.isConsensual ? 'consensual' : 'personal';
    await api(`plugin-jobs/${jobId}/feedback/${mode}`, {
      method: 'POST',
      data: feedbackState.currentData
    });
    reloadJob();
  };

  const modeText = feedbackState.isConsensual ? 'consensual' : 'personal';

  return (
    <FullSpanContainer>
      <StyledDiv>
        <div className="job-detail-header">
          <PluginDisplay pluginId={job.pluginId} size="xl" />
          <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
        </div>
        <div className="job-main">
          <div className="feedback-mode-switch">
            <PersonalConsensualSwitch
              feedbackState={feedbackState}
              onChange={handleChangeFeedbackMode}
            />
          </div>
          <div className="feedback-targets">
            {feedbackTargets.map(t => {
              const Render = t.render;
              const feedback = feedbackState.currentData[t.feedbackKey];
              return (
                <Render
                  key={t.feedbackKey}
                  job={job}
                  feedback={feedback}
                  feedbackState={feedbackState}
                  onChange={value => handleChange(t.feedbackKey, value)}
                />
              );
            })}
          </div>
          <div className="feedback-nav">
            {feedbackState.message && (
              <span className="regsiter-message">{feedbackState.message}</span>
            )}
            <PieProgress max={5} value={2} />&ensp;
            <IconButton
              icon={feedbackState.isConsensual ? 'tower' : 'user'}
              disabled={!feedbackState.canRegister}
              onClick={handleRegisterClick}
            >
              Regsiter {modeText} feedback
            </IconButton>
          </div>
        </div>
      </StyledDiv>
    </FullSpanContainer>
  );
};

export default PluginJobDetail;
