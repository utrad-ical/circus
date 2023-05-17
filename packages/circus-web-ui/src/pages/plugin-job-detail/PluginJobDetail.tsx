import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import {
  CsResultsContext,
  CsResultsContextType,
  FeedbackReport,
  Job,
  Plugin
} from '@utrad-ical/circus-ui-kit';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import FullSpanContainer from 'components/FullSpanContainer';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import PatientInfoBox from 'components/PatientInfoBox';
import PieProgress from 'components/PieProgress';
import PluginDisplay from 'components/PluginDisplay';
import SearchResultsView from 'components/SearchResultsView';
import TimeDisplay from 'components/TimeDisplay';
import UserDisplay from 'components/UserDisplay';
import {
  DropdownButton,
  MenuItem,
  Modal,
  ProgressBar
} from 'components/react-bootstrap';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { newSearch } from 'store/searches';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import useLoadData from 'utils/useLoadData';
import useLoginUser from 'utils/useLoginUser';
import useQuery from 'utils/useQuery';
import { useVolumeLoaders } from 'utils/useVolumeLoader';
import DeleteFeedbackModal from './DeleteFeedbackModal';
import InvestigateJobModal from './InvestigateJobModal';
import MainDisplay from './MainDisplay';
import PersonalConsensualSwitch from './PersonalConsensualSwitch';
import loadDisplay from './loadDisplay';
import useFeedback, { actions } from './useFeedback';

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
      <MenuItem eventKey="deleteFeedback">
        <Icon icon="remove" />
        &ensp;Delete feedback
      </MenuItem>
      <MenuItem eventKey="investigate">
        <Icon icon="search" />
        &ensp;Investigate
      </MenuItem>
    </DropdownButton>
  );
});

const RelevantJobs: React.FC<{
  currentJobId: string;
}> = props => {
  const { currentJobId } = props;

  const RelevantJobsDataView: React.FC<any> = useMemo(
    () => props => {
      const { value } = props;
      const columns: DataGridColumnDefinition<any>[] = [
        {
          caption: 'Plugin',
          className: 'plugin',
          renderer: ({ value: { pluginId } }) => (
            <PluginDisplay size="xs" pluginId={pluginId} />
          )
        },
        {
          key: 'registeredAt',
          caption: 'Registered At',
          renderer: ({ value }) => <TimeDisplay value={value.createdAt} />
        },
        {
          key: 'finishedAt',
          caption: 'Finished At',
          renderer: ({ value }) => <TimeDisplay value={value.finishedAt} />
        },
        {
          caption: 'Status',
          className: 'status',
          renderer: ({ value: { status } }) => {
            if (status === 'processing') {
              return (
                <ProgressBar
                  active
                  bsStyle="info"
                  now={100}
                  label="processing"
                />
              );
            }
            const className = {
              in_queue: 'text-info',
              finished: 'text-success'
            }[status as 'in_queue' | 'finished'];
            return <span className={className || 'text-danger'}>{status}</span>;
          }
        },
        {
          caption: 'FB',
          className: 'feedback',
          renderer: ({ value: { feedbacks = [] } }) => {
            const personals = feedbacks.filter(
              (f: any) => !f.isConsensual
            ).length;
            const consensual = feedbacks.filter(
              (f: any) => f.isConsensual
            ).length;
            const title = `${personals} personal feedback ${
              personals === 1 ? 'entry' : 'entries'
            }`;
            return (
              <span title={title}>
                {personals > 0 && (
                  <span>
                    <Icon icon="user" />
                    {personals > 0 && personals}
                  </span>
                )}
                {consensual > 0 && <Icon icon="tower" />}
                {!personals && !consensual && (
                  <span className="feedback-none">none</span>
                )}
              </span>
            );
          }
        },
        {
          key: 'action',
          caption: '',
          renderer: ({ value }) =>
            currentJobId === value.jobId ? null : (
              <div className="register">
                <Link to={`/plugin-job/${value.jobId}`}>
                  <IconButton
                    disabled={value.status !== 'finished'}
                    icon="circus-series"
                    bsSize="sm"
                    bsStyle="primary"
                  >
                    View
                  </IconButton>
                </Link>
              </div>
            )
        }
      ];
      return <DataGrid value={value} columns={columns} />;
    },
    []
  );

  return (
    <div style={{ whiteSpace: 'nowrap', margin: '1em' }}>
      <div>Showing jobs from the same patient</div>
      <SearchResultsView name="relevantJobs" dataView={RelevantJobsDataView} />
    </div>
  );
};

const PluginJobDetail: React.FC<{}> = props => {
  const api = useApi();
  const jobId: string = useParams<any>().jobId;
  const initialMode = useQuery().get('initialmode') ?? '';

  const user = useLoginUser();
  const [busy, setBusy] = useState(false);
  const [feedbackState, dispatch] = useFeedback();

  const [showInvestigateModal, setShowInvestigateModal] = useState(false);
  const [showDeleteFeedbackModal, setShowDeleteFeedbackModal] = useState(false);
  const dispatchForJobSearch = useDispatch();

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

      if (
        job.series[0].seriesUid &&
        seriesData[job.series[0].seriesUid].patientInfo
      ) {
        const filter = {
          'patientInfo.patientId':
            seriesData[job.series[0].seriesUid].patientInfo.patientId
        };

        dispatchForJobSearch(
          newSearch(api, 'relevantJobs', {
            resource: { endPoint: 'plugin-jobs', primaryKey: 'jobId' },
            filter,
            condition: {},
            sort: '{"createdAt":-1}'
          })
        );
      }

      return { job, pluginData, seriesData };
    } finally {
      setBusy(false);
    }
  }, [api, initialMode, dispatch, jobId, user.userEmail]);

  const [jobData, , reloadJob] = useLoadData(loadJob);

  const handleMenuSelect = useCallback(async selected => {
    switch (selected) {
      case 'deleteFeedback': {
        setShowDeleteFeedbackModal(true);
        break;
      }
      case 'investigate': {
        setShowInvestigateModal(true);
        break;
      }
    }
  }, []);

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
      loadDisplay: loadDisplay(jobData.pluginData.pluginId),
      UserDisplay
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
          {seriesData[primarySeriesUid].patientInfo ? (
            <DropdownButton
              id="jobmenu"
              title={
                <PatientInfoBox
                  value={seriesData[primarySeriesUid].patientInfo}
                />
              }
              noCaret
              disabled={busy}
              style={{ textAlign: 'left', border: 'none', padding: '0px' }}
            >
              <RelevantJobs currentJobId={jobId} />
            </DropdownButton>
          ) : (
            <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
          )}
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
          <Modal
            bsSize="lg"
            show={showDeleteFeedbackModal}
            onHide={() => setShowDeleteFeedbackModal(false)}
          >
            <DeleteFeedbackModal />
          </Modal>
        </CsResultsContext.Provider>
      </StyledDiv>
    </FullSpanContainer>
  );
};

export default PluginJobDetail;
