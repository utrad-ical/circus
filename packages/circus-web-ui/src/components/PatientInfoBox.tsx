import React, { Fragment } from 'react';
import Icon from '#components/Icon.tsx';
import type PatientInfo from '#types/PatientInfo.ts';
import styles from './PatientInfoBox.module.css';

const PatientInfoBox: React.FC<{
  value: PatientInfo | undefined;
}> = props => {
  const { value: pt } = props;
  if (!pt) {
    return (
      <div className={styles.patientInfoBox}>
        <div className={styles.masked}>
          <span className={styles.patientName}>
            <Icon icon="material-lock" />
            &ensp;(masked)
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.patientInfoBox}>
      <div className="main">
        <span className={styles.patientName}>{pt.patientName}</span>&ensp;
        <span className="patient-age">{pt.age}</span>
        <span className="patient-sex">{pt.sex}</span>
      </div>
      <div className={styles.sub}>
        <span className={styles.patientId}>{pt.patientId}</span>
        {pt.birthDate && (
          <Fragment>
            &ensp;<span className="patient-birthdate">DOB: {pt.birthDate}</span>
          </Fragment>
        )}
        {typeof pt.size === 'number' && pt.size > 0 && (
          <Fragment>
            &ensp;<span className="patient-size">Ht: {pt.size}</span>
          </Fragment>
        )}
        {typeof pt.weight === 'number' && pt.weight > 0 && (
          <Fragment>
            &ensp;<span className="patient-weight">Wt: {pt.weight}</span>
          </Fragment>
        )}
      </div>
    </div>
  );
};

export default PatientInfoBox;
