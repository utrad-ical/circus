import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from 'utils/api';
import PatientInfoBox from 'components/PatientInfoBox';
import FullSpanContainer from 'components/FullSpanContainer';
import LoadingIndicator from 'rb/LoadingIndicator';
import LesionCandidates from './LesionCandidates';
import PluginDisplay from 'components/PluginDisplay';
import createSelectionFeedbackListener from './feedback-listeners/createSelectionFeedbackListener';
import FeedbackSwitcher from './FeedbackSwitcher';
import styled from 'styled-components';

const JobContent = props => {
  const { job, feedbackState, feedbackDispatch } = props;

  const listenerOptions = {
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
  };
  const FeedbackListener = useMemo(
    () => createSelectionFeedbackListener(listenerOptions),
    [listenerOptions]
  );

  return (
    <div>
      <LesionCandidates
        job={job}
        value={job.results.results.lesionCandidates}
        feedbackListener={FeedbackListener}
        feedbackState={feedbackState}
        feedbckDispatch={feedbackDispatch}
      />
    </div>
  );
};

const StyledDiv = styled.div`
  .job-detail-main {
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
`;

const useJobDetailData = jobId => {
  const api = useApi();
  const [data, setData] = useState(undefined);

  const fetchJob = async () => {
    try {
      const job = await api(`plugin-jobs/${jobId}`);
      const seriesData = {};
      for (const s of job.series) {
        const seriesUid = s.seriesUid;
        if (seriesUid in seriesData) continue;
        seriesData[seriesUid] = await api(`series/${seriesUid}`);
      }
      const result = { job, seriesData };
      setData(result);
    } catch (e) {
      setData(e);
    }
  };

  useEffect(
    () => {
      fetchJob();
    },
    [jobId]
  );

  return data;
};

const PluginJobDetail = props => {
  const jobId = props.match.params.jobId;
  const jobData = useJobDetailData(jobId);

  if (!jobData) {
    return <LoadingIndicator />;
  }

  if (jobData instanceof Error) {
    return <div className="alert alert-danger">{jobData.message}</div>;
  }

  const { job, seriesData } = jobData;
  const primarySeriesUid = job.series[0].seriesUid;

  return (
    <FullSpanContainer>
      <StyledDiv>
        <div className="job-detail-header">
          <PluginDisplay pluginId={job.pluginId} size="xl" />
          <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
        </div>
        <div className="job-detail-main">
          <FeedbackSwitcher
            job={job}
            seriesData={seriesData}
            jobRenderer={JobContent}
          />
        </div>
      </StyledDiv>
    </FullSpanContainer>
  );
};

export default PluginJobDetail;
