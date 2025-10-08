import React from 'react';
import JsonSchemaEditor from '@smikitky/rb-components/lib/JsonSchemaEditor';
import styled from 'styled-components';

const StyledDiv = styled.div`
  input,
  select {
    color: var(--circus-background-text);
    background: var(--circus-background);
    &.invalid {
      background: var(--circus-invalid-background)};
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
