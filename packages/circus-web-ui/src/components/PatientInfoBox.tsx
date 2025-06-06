import React, { Fragment } from 'react';
import Icon from 'components/Icon';
import styled from 'styled-components';
import PatientInfo from 'types/PatientInfo';

const StyledDiv = styled.div`
  .masked {
    color: silver;
    line-height: 2.2;
  }
  .sub {
    font-size: 80%;
    color: gray;
  }
  .patient-id {
    font-style: italic;
  }
  .patient-name {
    font-weight: bold;
  }
`;

const PatientInfoBox: React.FC<{
  value: PatientInfo | undefined;
}> = props => {
  const { value: pt } = props;
  if (!pt) {
    return (
      <StyledDiv>
        <div className="masked">
          <span className="patient-name">
            <Icon icon="material-lock" />
            &ensp;(masked)
          </span>
        </div>
      </StyledDiv>
    );
  }
  return (
    <StyledDiv>
      <div className="main">
        <span className="patient-name">{pt.patientName}</span>&ensp;
        <span className="patient-age">{pt.age}</span>
        <span className="patient-sex">{pt.sex}</span>
      </div>
      <div className="sub">
        <span className="patient-id">{pt.patientId}</span>
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
    </StyledDiv>
  );
};

export default PatientInfoBox;
