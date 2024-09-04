import { Editor } from './processor-types';
import { FormControl } from 'components/react-bootstrap';
import React from 'react';
import { DuplicateOptions } from './duplicateProcessor';

export const initialOptions: DuplicateOptions = {
  newName: 'duplicated label'
};

export const OptionsEditor: Editor<DuplicateOptions> = props => {
  const { value, onChange } = props;
  return (
    <div>
      <label>New label&rsquo;s name&nbsp; </label>
      <FormControl
        type="text"
        autoFocus
        value={value.newName}
        onChange={(ev: any) => onChange({ ...value, newName: ev.target.value })}
      />
    </div>
  );
};
