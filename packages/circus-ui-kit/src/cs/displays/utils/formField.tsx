import styled from 'styled-components';

// Form parts of the built-in displays, colored with the host's design tokens

export const Field = styled.div`
  margin-bottom: 15px;
`;

export const FieldLabel = styled.label`
  display: block;
  font-weight: bold;
  > input {
    margin-top: 5px;
  }
`;

// Can be placed inside `FieldLabel`
export const TextInput = styled.input`
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0.375em 0.75em;
  border: 1px solid var(--border, silver);
  background-color: var(--bg, white);
  color: var(--text, black);
  font: inherit;
  font-weight: normal;
  line-height: 1.43;
  &:disabled {
    background-color: var(--surface, #eee);
    cursor: not-allowed;
  }
  &[aria-invalid='true'] {
    border-color: var(--danger, #c00);
  }
`;

export const SelectInput = styled.select`
  padding: 0.375em 0.5em;
  border: 1px solid var(--border, silver);
  background-color: var(--bg, white);
  color: var(--text, black);
  font: inherit;
  line-height: 1.43;
  &:disabled {
    background-color: var(--surface, #eee);
    cursor: not-allowed;
  }
  &[aria-invalid='true'] {
    border-color: var(--danger, #c00);
  }
`;
