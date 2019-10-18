import React, { Fragment, useState, useMemo, useCallback, useRef } from 'react';
import { useApi } from 'utils/api';
import PatientInfoBox from 'components/PatientInfoBox';
import FullSpanContainer from 'components/FullSpanContainer';
import LoadingIndicator from 'rb/LoadingIndicator';
import * as modal from 'rb/modal';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';
import styled from 'styled-components';
import useFeedback from './useFeedback';
import PersonalConsensualSwitch from './PersonalConsensualSwitch';
import useLoadData from 'utils/useLoadData';
import { VolumeLoaderCacheContext } from 'utils/useImageSource';
import * as rs from 'circus-rs';
import PieProgress from 'components/PieProgress';
import createDynamicComponent from './createDynamicComponent';
import Section from './Section';
import useLoginUser from 'utils/useLoginUser';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';
import Icon from 'components/Icon';

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
    .regisiter-message {
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

const Menu = React.memo(props => {
  const { onMenuSelect } = props;
  return (
    <DropdownButton
      id="submenu"
      bsStyle="link"
      title={<Icon icon="menu-hamburger" />}
      pullRight
      noCaret
    >
      <MenuItem eventKey="deleteAllFeedback" onSelect={onMenuSelect}>
        <Icon icon="remove" />&ensp;Delete all feedback
      </MenuItem>
    </DropdownButton>
  );
});

const PluginJobDetail = props => {
  const api = useApi();
  const jobId = props.match.params.jobId;

  const user = useLoginUser();
  const server = user.dicomImageServer;
  const rsHttpClient = useMemo(() => new rs.RsHttpClient(server), [server]);
  const [volumeLoaderMap] = useState(() => ({ rsHttpClient, map: new Map() }));
  const [busy, setBusy] = useState(false);
  const [feedbackState, dispatch] = useFeedback();

  const loadJob = useCallback(
    async () => {
      setBusy(true);
      try {
        const job = await api(`plugin-jobs/${jobId}`);
        const pluginData = await api(`plugins/${job.pluginId}`);
        const seriesData = {};
        for (const s of job.series) {
          const seriesUid = s.seriesUid;
          if (seriesUid in seriesData) continue;
          seriesData[seriesUid] = await api(`series/${seriesUid}`);
        }
        dispatch({
          type: 'reset',
          feedbacks: job.feedbacks,
          myUserEmail: user.userEmail
        });
        return { job, pluginData, seriesData };
      } finally {
        setBusy(false);
      }
    },
    [api, dispatch, jobId, user.userEmail]
  );

  const [jobData, , reloadJob] = useLoadData(loadJob);

  const feedbackTargets = useMemo(
    () => jobData && createFeedbackTargets(jobData.pluginData.displayStrategy),
    [jobData]
  );

  const handleMenuSelect = useCallback(
    async selected => {
      switch (selected) {
        case 'deleteAllFeedback': {
          const confirm = await modal.confirm(
            <span>
              Do you want to remove <b>all</b> feedback data?
            </span>
          );
          if (!confirm) return;
          try {
            setBusy(true);
            await api(`plugin-jobs/${jobId}/feedback/all`, {
              method: 'delete'
            });
            await modal.alert('All feedback data were deleted.');
            reloadJob();
          } finally {
            setBusy(false);
          }
          break;
        }
      }
    },
    [api, jobId, reloadJob]
  );

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
    setBusy(true);
    try {
      const mode = feedbackState.isConsensual ? 'consensual' : 'personal';
      await api(`plugin-jobs/${jobId}/feedback/${mode}`, {
        method: 'POST',
        data: feedbackState.currentData
      });
      reloadJob();
    } finally {
      setBusy(false);
    }
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
    <VolumeLoaderCacheContext.Provider value={volumeLoaderMap}>
      <FullSpanContainer>
        <StyledDiv>
          <div className="job-detail-header">
            <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
            <div className="feedback-mode-switch">
              <PersonalConsensualSwitch
                feedbackState={feedbackState}
                consensualEntered={job.feedbacks.some(f => f.isConsensual)}
                myPersonalEntered={job.feedbacks.some(
                  f => !f.isConsensual && f.userEmail === user.userEmail
                )}
                onChange={handleChangeFeedbackMode}
              />
            </div>
            <PluginDisplay pluginId={job.pluginId} size="xl" />
            <Menu onMenuSelect={handleMenuSelect} />
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
              <span className="regisiter-message text-success">
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
              disabled={!feedbackState.canRegister || busy}
              onClick={handleRegisterClick}
            >
              Register {modeText} feedback
            </IconButton>
          </div>
        </StyledDiv>
      </FullSpanContainer>
    </VolumeLoaderCacheContext.Provider>
  );
};

export default PluginJobDetail;
