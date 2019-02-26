import React, { useState, useEffect, useMemo } from 'react';
import PatientInfoBox from 'components/PatientInfoBox';
import FullSpanContainer from 'components/FullSpanContainer';
import { api } from 'utils/api';
import LoadingIndicator from 'rb/LoadingIndicator';
import LesionCandidates from './LesionCandidates';
import PluginDisplay from 'components/PluginDisplay';
import createSelectionFeedbackListener from './feedback-listener/createSelectionFeedbackListener';
import FeedbackSwitcher from './FeedbackSwitcher';
// import useLoginUser from 'utils/useLoginUser';

const PluginJobDetailView = props => {
  const { job, onFeedbackChange, feedback, isConsensual } = props;

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
  const feedbackListener = useMemo(
    () => createSelectionFeedbackListener(listenerOptions),
    [listenerOptions]
  );

  return (
    <div>
      <LesionCandidates
        job={job}
        value={job.results.results.lesionCandidates}
        isConsensual={isConsensual}
        feedbackListener={feedbackListener}
        feedback={feedback}
        onFeedbackChange={onFeedbackChange}
      />
    </div>
  );
};

const PluginJobDetailPage = props => {
  const { job, seriesData } = props;
  const primarySeriesUid = job.series[0].seriesUid;
  return (
    <FullSpanContainer>
      <div className="job-detail-header">
        <PluginDisplay pluginId={job.pluginId} size="xl" />
        <PatientInfoBox value={seriesData[primarySeriesUid].patientInfo} />
      </div>
      <div className="job-detail-main">
        <FeedbackSwitcher {...props} />
      </div>
    </FullSpanContainer>
  );
};

const PluginJobDetail = props => {
  const [job, setJob] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  // const user = useLoginUser();
  const plugin = null;

  const fetchJob = async () => {
    const jobId = props.match.params.jobId;
    try {
      const job = await api(`plugin-jobs/${jobId}`);
      const seriesData = {};
      for (const s of job.series) {
        const seriesUid = s.seriesUid;
        if (seriesUid in seriesData) continue;
        seriesData[seriesUid] = await api(`series/${seriesUid}`);
      }
      setJob(job);
      setSeriesData(seriesData);
    } catch (e) {
      setErrorMessage(e.message);
    }
  };

  useEffect(() => {
    fetchJob();
  }, []);

  if (errorMessage) {
    return <div className="alert alert-danger">{errorMessage}</div>;
  } else if (job && seriesData) {
    return (
      <PluginJobDetailPage
        jobRenderer={PluginJobDetailView}
        job={job}
        seriesData={seriesData}
        plugin={plugin}
      />
    );
  } else {
    return <LoadingIndicator />;
  }
};

export default PluginJobDetail;
