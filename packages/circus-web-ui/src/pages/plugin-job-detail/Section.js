import React from 'react';
import styled from 'styled-components';

const Section = props => {
  const { title, children } = props;
  return (
    <StyledSection>
      <div className="section-header">{title}</div>
      <div className="section-content">{children}</div>
    </StyledSection>
  );
};

export default Section;

const StyledSection = styled.section`
  margin-top: 15px;
  :first-child {
    margin-top: 0px;
  }
  .section-header {
    background-color: ${props => props.theme.brandPrimary};
    color: white;
    height: 30px;
    padding: 0 10px;
    line-height: 30px;
    font-weight: bold;
  }
  .section-content {
    padding: 10px;
  }
`;
