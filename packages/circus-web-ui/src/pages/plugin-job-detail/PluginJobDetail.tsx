import React, {
  Fragment,
  useState,
  useMemo,
  useContext,
  useCallback
} from 'react';
import { useApi } from 'utils/api';
import PatientInfoBox from 'components/PatientInfoBox';
import FullSpanContainer from 'components/FullSpanContainer';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import * as modal from '@smikitky/rb-components/lib/modal';
import PluginDisplay from 'components/PluginDisplay';
import IconButton from 'components/IconButton';
import styled from 'styled-components';
import useFeedback, { actions } from './useFeedback';
import PersonalConsensualSwitch from './PersonalConsensualSwitch';
import useLoadData from 'utils/useLoadData';
import PieProgress from 'components/PieProgress';
import useLoginUser from 'utils/useLoginUser';
import { DropdownButton, MenuItem, Modal } from 'components/react-bootstrap';
import Icon from 'components/Icon';
import { useParams } from 'react-router-dom';
import MainDisplay from './MainDisplay';
import {
  Job,
  Plugin,
  CsResultsContext,
  CsResultsContextType,
  FeedbackReport
} from '@utrad-ical/circus-ui-kit';
import loadDisplay from './loadDisplay';
import InvestigateJobModal from './InvestigateJobModal';
import { useVolumeLoaders } from 'utils/useVolumeLoader';
import useQuery from 'utils/useQuery';

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

const Menu: React.FC<{
  onMenuSelect: (selected: any) => void;
}> = React.memo(props => {
  const { onMenuSelect } = props;
  return (
    <DropdownButton
      id="submenu"
      bsStyle="link"
      title={<Icon icon="menu-hamburger" />}
      onSelect={onMenuSelect}
      pullRight
      noCaret
    >
      <MenuItem eventKey="deleteAllFeedback">
        <Icon icon="remove" />
        &ensp;Delete all feedback
      </MenuItem>
      <MenuItem eventKey="investigate">
        <Icon icon="search" />
        &ensp;Investigate
      </MenuItem>
    </DropdownButton>
  );
});

const PluginJobDetail: React.FC<{}> = props => {
  const api = useApi();
  const jobId: string = useParams<any>().jobId;
  const initialMode = useQuery().get('initialmode') ?? '';

  const user = useLoginUser();
  const [busy, setBusy] = useState(false);
  const [feedbackState, dispatch] = useFeedback();

  const [showInvestigateModal, setShowInvestigateModal] = useState(false);

  const loadJob = useCallback(async () => {
    setBusy(true);
    try {
      const job = (await api(`plugin-jobs/${jobId}`)) as Job;
      const pluginData = (await api(`plugins/${job.pluginId}`)) as Plugin;
      const seriesData: { [seriesUid: string]: any } = {};
      for (const s of job.series) {
        const seriesUid = s.seriesUid;
        if (seriesUid in seriesData) continue;
        seriesData[seriesUid] = await api(`series/${seriesUid}`);
      }
      dispatch(
        actions.reset({
          feedbacks: job.feedbacks,
          myUserEmail: user.userEmail,
          preferMode: ['consensual', 'personal'].includes(initialMode)
            ? (initialMode as 'personal' | 'consensual')
            : null
        })
      );
      return { job, pluginData, seriesData };
    } finally {
      setBusy(false);
    }
  }, [api, initialMode, dispatch, jobId, user.userEmail]);

  const [jobData, , reloadJob] = useLoadData(loadJob);

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
        case 'investigate': {
          setShowInvestigateModal(true);
          break;
        }
      }
    },
    [api, jobId, reloadJob]
  );

  const insertLog = useCallback(
    (action: string, data?: any) => {
      dispatch(
        actions.logEventHappened({
          date: new Date().toISOString(),
          action,
          data
        })
      );
    },
    [dispatch]
  );

  const resultsContext = useMemo<CsResultsContextType | undefined>(() => {
    if (!jobData || jobData instanceof Error) return undefined;
    const { job, pluginData } = jobData;

    const loadAttachment = (path: string, signal?: AbortSignal) => {
      const url = `/api/plugin-jobs/${job.jobId}/attachment/${path}`;
      const token = api.getToken();
      return fetch(url, {
        signal,
        headers: { Authorization: `Bearer ${token}` }
      });
    };
    loadAttachment.list = () =>
      api(`plugin-jobs/${job.jobId}/attachment`) as Promise<string[]>;

    return {
      consensual: feedbackState.isConsensual,
      editable: feedbackState.editable,
      job,
      plugin: pluginData,
      eventLogger: insertLog,
      useVolumeLoaders,
      loadAttachment,
      loadDisplay: loadDisplay(jobData.pluginData.pluginId)
    };
  }, [
    jobData,
    feedbackState.isConsensual,
    feedbackState.editable,
    insertLog,
    api
  ]);

  const handleFeedbackChange = useCallback(
    (state: FeedbackReport<unknown>) => {
      if (state.valid) {
        dispatch(actions.validFeedbackEntered({ value: state.value }));
      } else {
        dispatch(
          actions.invalidFeedbackEntered({
            total: state.error.total,
            finished: state.error.finished
          })
        );
      }
    },
    [dispatch]
  );

  if (!jobData) {
    return <LoadingIndicator />;
  }

  if (jobData instanceof Error) {
    return <div className="alert alert-danger">{jobData.message}</div>;
  }

  const { job, seriesData, pluginData } = jobData;
  const primarySeriesUid = job.series[0].seriesUid;

  const handleChangeFeedbackMode = (isConsensual: boolean) => {
    if (isConsensual) {
      dispatch(actions.enterConsensualMode({}));
    } else {
      dispatch(actions.enterPersonalMode({}));
    }
  };

  const handleRegisterClick = async () => {
    setBusy(true);
    try {
      const mode = feedbackState.isConsensual ? 'consensual' : 'personal';
      await api(`plugin-jobs/${jobId}/feedback/${mode}`, {
        method: 'POST',
        data: {
          data: feedbackState.currentData,
          actionLog: feedbackState.actionLog
        }
      });
      reloadJob();
    } finally {
      setBusy(false);
    }
  };

  const modeText = feedbackState.isConsensual ? 'consensual' : 'personal';

  return (
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
        <CsResultsContext.Provider value={resultsContext!}>
          <MainDisplay
            key={feedbackState.isConsensual ? 'consensual' : 'personal'}
            initialFeedbackValue={feedbackState.currentData}
            options={pluginData.displayStrategy}
            personalOpinions={
              feedbackState.isConsensual
                ? feedbackState.feedbacks.filter(fb => !fb.isConsensual)
                : []
            }
            consensualOpinions={
              feedbackState.feedbacks.filter(fb => fb.isConsensual) && []
            }
            onFeedbackChange={handleFeedbackChange}
          />
        </CsResultsContext.Provider>
        <div className="job-detail-footer">
          {feedbackState.message && (
            <span className="regisiter-message text-success">
              {feedbackState.message}
            </span>
          )}
          {feedbackState.editable && (
            <Fragment>
              <PieProgress
                max={feedbackState.count.total}
                value={feedbackState.count.finished}
              />
              &ensp;
            </Fragment>
          )}
          <IconButton
            icon={feedbackState.isConsensual ? 'tower' : 'user'}
            disabled={!feedbackState.valid || busy}
            onClick={handleRegisterClick}
          >
            Register {modeText} feedback
          </IconButton>
        </div>
        <CsResultsContext.Provider value={resultsContext!}>
          <Modal
            bsSize="lg"
            show={showInvestigateModal}
            onHide={() => setShowInvestigateModal(false)}
          >
            <InvestigateJobModal />
          </Modal>
        </CsResultsContext.Provider>
      </StyledDiv>
    </FullSpanContainer>
  );
};

export default PluginJobDetail;
