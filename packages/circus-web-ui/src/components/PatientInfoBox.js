import React, { Fragment } from 'react';
import styled from 'styled-components';

const StyledDiv = styled.div`
  &.masked {
    color: silver;
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

const PatientInfoBox = props => {
  const pt = props.value;
  if (!pt) {
    return <span className="patient-info-box masked">(masked)</span>;
  }
  return (
    <StyledDiv>
      <div>
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
        {pt.size > 0 && (
          <Fragment>
            &ensp;<span className="patient-size">Ht: {pt.size}</span>
          </Fragment>
        )}
        {pt.weight > 0 && (
          <Fragment>
            &ensp;<span className="patient-weight">Wt: {pt.weight}</span>
          </Fragment>
        )}
      </div>
    </StyledDiv>
  );
};

export default PatientInfoBox;
