import u from '#components/utilities.module.css';
import Icon from '#components/Icon.tsx';
import type {
  CaseSearchItem,
  PatientInfo as PatientData,
  PluginJob,
  Series
} from '@utrad-ical/circus-api-schema';
import IdDisplay from '#components/IdDisplay.tsx';
import PatientInfoBox from '#components/PatientInfoBox.tsx';
import PluginDisplay from '#components/PluginDisplay.tsx';
import ProjectDisplay from '#components/ProjectDisplay.tsx';
import { TagList } from '#components/Tag.tsx';
import TimeDisplay from '#components/TimeDisplay.tsx';
import UserDisplay from '#components/UserDisplay.tsx';
import statusStyles from './Status.module.css';
import React, { useMemo } from 'react';
import styles from './SearchResultRenderer.module.css';

export const PatientInfo = (props: {
  value: { patientInfo?: PatientData };
}) => {
  const {
    value: { patientInfo }
  } = props;
  return <PatientInfoBox value={patientInfo} />;
};

type TimeField = 'createdAt' | 'updatedAt' | 'finishedAt' | 'seriesDate';

export const Times =
  (timeKey1: TimeField = 'createdAt', timeKey2: TimeField = 'updatedAt') =>
  (props: { value: Partial<Pick<PluginJob & Series, TimeField>> }) => {
    return (
      <>
        <TimeDisplay value={props.value[timeKey1]} />
        <br />
        <TimeDisplay value={props.value[timeKey2]} />
      </>
    );
  };

export const Tags = (props: {
  value: Pick<CaseSearchItem, 'tags' | 'projectId'>;
}) => {
  const { value: item } = props;
  return <TagList tags={item.tags} projectId={item.projectId} />;
};

export const Project =
  (size = 'lg') =>
  (props: { value: Pick<CaseSearchItem, 'projectId'> }) => {
    const item = props.value;
    return <ProjectDisplay projectId={item.projectId} size={size} withName />;
  };

export const CaseId = (props: { value: Pick<CaseSearchItem, 'caseId'> }) => {
  const { caseId } = props.value;
  const ids = useMemo(() => ({ 'Case ID': caseId }), [caseId]);
  return <IdDisplay value={ids} />;
};

export const PluginRenderer =
  (size = 'lg') =>
  (props: { value: Pick<PluginJob, 'pluginId'> }) => {
    const {
      value: { pluginId }
    } = props;
    return <PluginDisplay size={size} pluginId={pluginId} />;
  };

export const JobId = (props: { value: Pick<PluginJob, 'jobId'> }) => {
  const { jobId } = props.value;
  const ids = useMemo(() => ({ 'Job ID': jobId }), [jobId]);
  return <IdDisplay value={ids} />;
};

export const Executer = (props: { value: Pick<PluginJob, 'userEmail'> }) => {
  const {
    value: { userEmail }
  } = props;
  return <UserDisplay userEmail={userEmail} />;
};

export const Status = (props: { value: Pick<PluginJob, 'status'> }) => {
  const {
    value: { status }
  } = props;
  if (status === 'processing') {
    return <span className={statusStyles.processing}>processing</span>;
  }
  const className = { in_queue: u.info, finished: u.success }[
    status as 'in_queue' | 'finished'
  ];
  return <span className={className || u.danger}>{status}</span>;
};

export const FeedbackRenderer = (props: {
  value: Pick<PluginJob, 'feedbacks'>;
}) => {
  const {
    value: { feedbacks = [] }
  } = props;
  const personals = feedbacks.filter(f => !f.isConsensual).length;
  const consensual = feedbacks.filter(f => f.isConsensual).length;
  const title = `${personals} personal feedback ${
    personals === 1 ? 'entry' : 'entries'
  }`;
  return (
    <span title={title}>
      {personals > 0 && (
        <span>
          <Icon icon="material-person" />
          {personals > 0 && personals}
        </span>
      )}
      {consensual > 0 && <Icon icon="material-crown" />}
      {!personals && !consensual && <span className={u.muted}>none</span>}
    </span>
  );
};

export const Modality = (props: { value: Pick<Series, 'modality'> }) => {
  const series = props.value;
  return <span className={styles.modality}>{series.modality}</span>;
};

export const UidDisplay = (props: {
  value: Pick<Series, 'seriesUid' | 'studyUid'>;
}) => {
  const { seriesUid, studyUid } = props.value;
  const ids = useMemo(
    () => ({ 'Series UID': seriesUid, 'Study UID': studyUid }),
    [seriesUid, studyUid]
  );
  return <IdDisplay value={ids} />;
};
