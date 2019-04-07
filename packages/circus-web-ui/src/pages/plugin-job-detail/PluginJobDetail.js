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
import Section from './Section';

const StyledDiv = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;

  .job-detail-header {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    border-bottom: 1px solid silver;
    align-items: center;
    > * {
      padding: 5px 10px;
    }
  }
  .feedback-mode-switch {
    flex: 1 0 auto;
  }
  .job-detail-main {
    min-height: 0;
    flex: 1 1 0;
    overflow-y: scroll;
  }
  .job-detail-footer {
    flex: none;
    padding: 10px;
    border-top: 1px solid silver;
    text-align: right;
    .regsiter-message {
      margin-right: 1em;
    }
  }
`;

const createFeedbackTargets = displayStrategy => {
  const feedbackTargets = [];
  for (const strategy of displayStrategy) {
    const render = createDynamicComponent(strategy.type, strategy.options);
    feedbackTargets.push({
      feedbackKey: strategy.feedbackKey,
      caption: strategy.caption,
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
      const pluginData = await api(`plugins/${job.pluginId}`);
      const seriesData = {};
      for (const s of job.series) {
        const seriesUid = s.seriesUid;
        if (seriesUid in seriesData) continue;
        seriesData[seriesUid] = await api(`series/${seriesUid}`);
      }
      return { job, pluginData, seriesData };
    },
    [api, jobId]
  );

  const [jobData, , reloadJob] = useLoadData(loadJob);

  const feedbackTargets = useMemo(
    () => jobData && createFeedbackTargets(jobData.pluginData.displayStrategy),
    [jobData]
  );

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
    const [isValid, registeredTargetCount] = validate(newFeedback);
    dispatch({
      type: 'changeFeedback',
      value: newFeedback,
      registeredTargetCount,
      canRegister: isValid
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

  const personalOpinionsForKey = key => {
    if (!feedbackState.isConsensual) return undefined;
    return job.feedbacks.filter(f => !f.isConsensual).map(f => {
      return {
        ...f,
        data: f.data[key]
      };
    });
  };

  return (
    <ImageSourceCacheContext.Provider value={imageSourceCache}>
      <FullSpanContainer>
        <StyledDiv>
          <div className="job-detail-header">
            <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
            <div className="feedback-mode-switch">
              <PersonalConsensualSwitch
                feedbackState={feedbackState}
                onChange={handleChangeFeedbackMode}
              />
            </div>
            <PluginDisplay pluginId={job.pluginId} size="xl" />
          </div>
          <div className="job-detail-main">
            <div className="feedback-targets">
              {feedbackTargets.map(target => {
                const Render = target.render;
                const key = target.feedbackKey;
                const feedback = feedbackState.currentData[key];
                const personalOpinions = feedbackState.isConsensual
                  ? personalOpinionsForKey(key)
                  : undefined;
                return (
                  <Section key={key} title={target.caption}>
                    <Render
                      ref={ref => listenerRefs.current.set(key, ref)}
                      job={job}
                      value={feedback}
                      personalOpinions={personalOpinions}
                      onChange={value => handleChange(key, value)}
                      isConsensual={feedbackState.isConsensual}
                      disabled={feedbackState.disabled}
                    />
                  </Section>
                );
              })}
            </div>
          </div>
          <div className="job-detail-footer">
            {/* <pre>{JSON.stringify(feedbackState.currentData)}</pre> */}
            {feedbackState.message && (
              <span className="regsiter-message">{feedbackState.message}</span>
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
        </StyledDiv>
      </FullSpanContainer>
    </ImageSourceCacheContext.Provider>
  );
};

export default PluginJobDetail;
