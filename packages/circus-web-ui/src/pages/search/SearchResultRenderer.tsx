import u from '#components/utilities.module.css';
import Icon from '#components/Icon.tsx';
import type { DataGridRenderer } from '#components/DataGrid.tsx';
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

export const PatientInfo: DataGridRenderer<any> = props => {
  const {
    value: { patientInfo }
  } = props;
  return <PatientInfoBox value={patientInfo} />;
};

export const Times: (
  timeKey1?: string,
  timeKey2?: string
) => DataGridRenderer<any> =
  (timeKey1 = 'createdAt', timeKey2 = 'updatedAt') =>
  props => {
    return (
      <>
        <TimeDisplay value={props.value[timeKey1]} />
        <br />
        <TimeDisplay value={props.value[timeKey2]} />
      </>
    );
  };

export const Tags: DataGridRenderer<any> = props => {
  const { value: item } = props;
  return <TagList tags={item.tags} projectId={item.projectId} />;
};

export const Project: (size?: string) => DataGridRenderer<any> =
  (size = 'lg') =>
  props => {
    const item = props.value;
    return <ProjectDisplay projectId={item.projectId} size={size} withName />;
  };

export const CaseId: DataGridRenderer<any> = props => {
  const { caseId } = props.value;
  const ids = useMemo(() => ({ 'Case ID': caseId }), [caseId]);
  return <IdDisplay value={ids} />;
};

export const PluginRenderer: (size?: string) => DataGridRenderer<any> =
  (size = 'lg') =>
  props => {
    const {
      value: { pluginId }
    } = props;
    return <PluginDisplay size={size} pluginId={pluginId} />;
  };

export const JobId: DataGridRenderer<any> = props => {
  const { jobId } = props.value;
  const ids = useMemo(() => ({ 'Job ID': jobId }), [jobId]);
  return <IdDisplay value={ids} />;
};

export const Executer: DataGridRenderer<any> = props => {
  const {
    value: { userEmail }
  } = props;
  return <UserDisplay userEmail={userEmail} />;
};

export const Status: DataGridRenderer<any> = props => {
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

export const FeedbackRenderer: DataGridRenderer<any> = props => {
  const {
    value: { feedbacks = [] }
  } = props;
  const personals = feedbacks.filter((f: any) => !f.isConsensual).length;
  const consensual = feedbacks.filter((f: any) => f.isConsensual).length;
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
      {!personals && !consensual && <span className="feedback-none">none</span>}
    </span>
  );
};

export const Modality: DataGridRenderer<any> = props => {
  const series = props.value;
  return <span className={styles.modality}>{series.modality}</span>;
};

export const UidDisplay: React.FC<{
  value: { seriesUid: string; studyUid: string };
}> = props => {
  const { seriesUid, studyUid } = props.value;
  const ids = useMemo(
    () => ({ 'Series UID': seriesUid, 'Study UID': studyUid }),
    [seriesUid, studyUid]
  );
  return <IdDisplay value={ids} />;
};
