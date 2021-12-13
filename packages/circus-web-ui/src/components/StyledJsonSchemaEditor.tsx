import React from 'react';
import JsonSchemaEditor from '@smikitky/rb-components/lib/JsonSchemaEditor';
import styled from 'styled-components';

const StyledDiv = styled.div`
  input,
  select {
    color: ${(props: any) => props.theme.textColor};
    background: ${(props: any) => props.theme.background};
    &.invalid {
      background: ${(props: any) => props.theme.invalidBackground};
    }
  }
`;

const StyledJsonSchemaEditor: typeof JsonSchemaEditor = props => {
  return (
    <StyledDiv>
      <JsonSchemaEditor {...props} />
    </StyledDiv>
  );
};

export default StyledJsonSchemaEditor;
