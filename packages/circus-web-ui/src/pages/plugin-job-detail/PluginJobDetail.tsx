import Button from '#components/Button.tsx';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import type {
  CsResultsContextType,
  FeedbackReport,
  Job,
  Plugin
} from '@utrad-ical/circus-ui-kit';
import { CsResultsContext } from '@utrad-ical/circus-ui-kit';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import DropdownButton from '#components/DropdownButton.tsx';
import FullSpanContainer from '#components/FullSpanContainer.tsx';
import Icon from '#components/Icon.tsx';
import MenuItem from '#components/MenuItem.tsx';
import PatientInfoBox from '#components/PatientInfoBox.tsx';
import PieProgress from '#components/PieProgress.tsx';
import PluginDisplay from '#components/PluginDisplay.tsx';
import SearchResultsView from '#components/SearchResultsView.tsx';
import UserDisplay from '#components/UserDisplay.tsx';
import { Modal } from '#components/react-bootstrap.ts';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { newSearch } from '#store/searches.ts';
import styled from 'styled-components';
import { useApi } from '#utils/api.ts';
import type { CancelToken } from '#utils/cancelToken.ts';
import useLoadData from '#utils/useLoadData.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import useQuery from '#utils/useQuery.ts';
import {
  FeedbackRenderer,
  PluginRenderer,
  Status,
  Times
} from '../search/SearchResultRenderer.tsx';
import DeleteFeedbackModal from './DeleteFeedbackModal.tsx';
import InvestigateJobModal from './InvestigateJobModal.tsx';
import MainDisplay from './MainDisplay.tsx';
import PersonalConsensualSwitch from './PersonalConsensualSwitch.tsx';
import loadDisplay from './loadDisplay.ts';
import useFeedback, { actions } from './useFeedback.tsx';

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
      variant="link"
      title={<Icon icon="material-menu" />}
      onSelect={onMenuSelect}
      align="end"
      noCaret
    >
      <MenuItem eventKey="deleteFeedback">
        <Icon icon="material-close" />
        Delete feedback
      </MenuItem>
      <MenuItem eventKey="investigate">
        <Icon icon="material-search" />
        Investigate
      </MenuItem>
    </DropdownButton>
  );
});

const RelevantJobs: React.FC<{
  currentJobId: string;
}> = props => {
  const { currentJobId } = props;

  const RelevantJobsDataView: React.FC<any> = React.memo(props => {
    const { value } = props;
    const columns: DataGridColumnDefinition<any>[] = [
      {
        caption: 'Plugin',
        className: 'plugin',
        renderer: PluginRenderer('xs')
      },
      {
        caption: 'Register/Finish',
        className: 'execution-time',
        renderer: Times('createdAt', 'finishedAt')
      },
      { caption: 'Status', className: 'status', renderer: Status },
      { caption: 'FB', className: 'feedback', renderer: FeedbackRenderer },
      {
        key: 'action',
        caption: '',
        renderer: ({ value }) =>
          currentJobId === value.jobId ? null : (
            <div className="register">
              <Link to={`/plugin-job/${value.jobId}`}>
                <Button
                  disabled={value.status !== 'finished'}
                  icon="circus-series"
                  size="small"
                  variant="primary"
                >
                  View
                </Button>
              </Link>
            </div>
          )
      }
    ];
    return <DataGrid value={value} columns={columns} />;
  });

  return (
    <div style={{ whiteSpace: 'nowrap', margin: '1em' }}>
      <div>Showing jobs from the same patient</div>
      <SearchResultsView name="relevantJobs" dataView={RelevantJobsDataView} />
    </div>
  );
};

const PluginJobDetail: React.FC<{}> = props => {
  const api = useApi();
  const jobId = useParams<any>().jobId;
  const initialMode = useQuery().get('initialmode') ?? '';

  const user = useLoginUser();
  const [busy, setBusy] = useState(false);
  const [feedbackState, dispatch] = useFeedback();

  const [showInvestigateModal, setShowInvestigateModal] = useState(false);
  const [showDeleteFeedbackModal, setShowDeleteFeedbackModal] = useState(false);
  const [noPermissionMessage, setNoPermissionMessage] = useState<string | null>(
    null
  );
  const memoizedAccessiblePlugins = useMemo(
    () => user.accessiblePlugins,
    [user]
  );
  const dispatchForJobSearch = useDispatch();

  const loadJob = useCallback(
    async (token: CancelToken) => {
      setBusy(true);
      try {
        const job = (await api(`plugin-jobs/${jobId}`, {}, token)) as Job;
        const pluginData = (await api(
          `plugins/${job.pluginId}`,
          {},
          token
        )) as Plugin;
        const seriesData: { [seriesUid: string]: any } = {};
        const viewPersonalInfoFlag = memoizedAccessiblePlugins
          .filter(p => p.roles.includes('viewPersonalInfo'))
          .some(p => p.pluginId === job.pluginId);
        for (const s of job.series) {
          const seriesUid = s.seriesUid;
          if (seriesUid in seriesData) continue;
          seriesData[seriesUid] = await api(`series/${seriesUid}`, {}, token);
          if (!viewPersonalInfoFlag) {
            delete seriesData[seriesUid].patientInfo;
          }
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
        if (!token.cancelled) setBusy(false);
      }
    },
    [
      api,
      initialMode,
      dispatch,
      jobId,
      user.userEmail,
      memoizedAccessiblePlugins,
      dispatchForJobSearch
    ]
  );

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
      // Authenticated with the session cookie
      const url = `/api/plugin-jobs/${job.jobId}/attachment/${path}`;
      return fetch(url, { signal });
    };
    loadAttachment.list = () =>
      api(`plugin-jobs/${job.jobId}/attachment`) as Promise<string[]>;

    const inputtableFeedback = memoizedAccessiblePlugins
      .filter(p =>
        p.roles.includes(
          feedbackState.isConsensual
            ? 'inputConsensualFeedback'
            : 'inputPersonalFeedback'
        )
      )
      .some(p => p.pluginId === job.pluginId);

    setNoPermissionMessage(
      inputtableFeedback
        ? null
        : `You do not have permission to input ${
            feedbackState.isConsensual ? 'consensual' : 'personal'
          } feedback`
    );

    return {
      consensual: feedbackState.isConsensual,
      editable: inputtableFeedback && feedbackState.editable,
      job,
      plugin: pluginData,
      eventLogger: insertLog,
      loadAttachment,
      loadDisplay: loadDisplay(jobData.pluginData.pluginId),
      UserDisplay
    };
  }, [
    jobData,
    feedbackState.isConsensual,
    feedbackState.editable,
    insertLog,
    api,
    memoizedAccessiblePlugins
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

  if (!jobId) {
    return <div className="alert alert-danger">No job ID specified.</div>;
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
          {noPermissionMessage && (
            <span className="regisiter-message text-danger">
              {noPermissionMessage}
            </span>
          )}
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
          <Button
            icon={
              feedbackState.isConsensual ? 'material-crown' : 'material-person'
            }
            disabled={!feedbackState.valid || busy}
            onClick={handleRegisterClick}
          >
            Register {modeText} feedback
          </Button>
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
