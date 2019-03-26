import React, { Fragment, useState, useMemo, useCallback, useRef } from 'react';
import { useApi } from 'utils/api';
import PatientInfoBox from 'components/PatientInfoBox';
import FullSpanContainer from 'components/FullSpanContainer';
import LoadingIndicator from 'rb/LoadingIndicator';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';
import styled from 'styled-components';
import useFeedback from './useFeedback';
import PersonalConsensualSwitch from './PersonalConsensualSwitch';
import useLoadData from 'utils/useLoadData';
import { ImageSourceCacheContext } from 'utils/useImageSource';
import PieProgress from 'components/PieProgress';
import createDynamicComponent from './createDynamicComponent';

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

const createFeedbackTargets = () => {
  const feedbackTargets = [];
  for (const strategy of displayStrategy) {
    const render = createDynamicComponent(strategy.type, strategy.options);
    feedbackTargets.push({
      feedbackKey: strategy.feedbackKey,
      render
    });
  }
  return feedbackTargets;
};

const PluginJobDetail = props => {
  const api = useApi();
  const jobId = props.match.params.jobId;

  const [imageSourceCache] = useState(() => new Map());

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

  // Keeps track of multiple refs using Map
  /**
   * @type React.MutableRefObject<Map<string, any>>;
   */
  const listenerRefs = useRef(undefined);
  if (!listenerRefs.current) listenerRefs.current = new Map();

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

  const validate = value => {
    const finished = feedbackTargets.filter(
      t =>
        listenerRefs.current
          .get(t.feedbackKey)
          .validate(value[t.feedbackKey]) === true
    );
    return [finished.length === feedbackTargets.length, finished.length];
  };

  const handleChange = (feedbackKey, value) => {
    const newFeedback = {
      ...feedbackState.currentData,
      [feedbackKey]: value
    };
    const [valid, registeredTargetCount] = validate(newFeedback);
    dispatch({
      type: 'changeFeedback',
      value: newFeedback,
      registeredTargetCount,
      canRegister: valid
    });
  };

  const handleChangeFeedbackMode = isConsensual => {
    if (isConsensual) {
      const mergedFeedback = {};
      feedbackTargets.forEach(({ feedbackKey }) => {
        const pfbs = job.feedbacks
          .filter(fb => !fb.isConsensual)
          .map(fb => fb.data[feedbackKey]);
        mergedFeedback[feedbackKey] = listenerRefs.current
          .get(feedbackKey)
          .mergePersonalFeedback(pfbs);
      });
      const [canRegister, registeredTargetCount] = validate(mergedFeedback);
      dispatch({
        type: 'enterConsensualMode',
        value: mergedFeedback,
        registeredTargetCount,
        canRegister
      });
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
      <ImageSourceCacheContext.Provider value={imageSourceCache}>
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
              {feedbackTargets.map(target => {
                const Render = target.render;
                const key = target.feedbackKey;
                const feedback = feedbackState.currentData[key];
                return (
                  <Render
                    key={key}
                    ref={ref => listenerRefs.current.set(key, ref)}
                    job={job}
                    value={feedback}
                    onChange={value => handleChange(key, value)}
                    isConsensual={feedbackState.isConsensual}
                    disabled={feedbackState.disabled}
                  />
                );
              })}
            </div>
            <div className="feedback-nav">
              {feedbackState.message && (
                <span className="regsiter-message">
                  {feedbackState.message}
                </span>
              )}
              {!feedbackState.disabled && (
                <Fragment>
                  <PieProgress
                    max={feedbackTargets.length}
                    value={feedbackState.registeredTargetCount}
                  />&ensp;
                </Fragment>
              )}
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
      </ImageSourceCacheContext.Provider>
    </FullSpanContainer>
  );
};

export default PluginJobDetail;
