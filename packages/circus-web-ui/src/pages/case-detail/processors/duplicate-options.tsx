import Input from '#components/Input.tsx';
import type { Editor } from './processor-types.ts';
import React from 'react';
import type { DuplicateOptions } from './duplicateProcessor.ts';

export const initialOptions: DuplicateOptions = {
  newName: 'duplicated label'
};

export const OptionsEditor: Editor<DuplicateOptions> = props => {
  const { value, onChange } = props;
  return (
    <div>
      <label>New label&rsquo;s name</label>
      <Input
        data-autofocus
        value={value.newName}
        onChange={ev => onChange({ ...value, newName: ev.target.value })}
      />
    </div>
  );
};
