import Button from '#components/Button.tsx';
import Icon from '#components/Icon.tsx';
import DropdownButton from '#components/DropdownButton.tsx';
import { DialogBody, DialogFooter, DialogHeader } from '#components/Dialog.tsx';
import { FormControl } from '#components/react-bootstrap.ts';
import MenuItem from '#components/MenuItem.tsx';
import keycode from 'keycode';
import type { ExternalLabel } from '#pages/case-detail/labelData.ts';
import type { Revision } from '#pages/case-detail/revisionData.ts';
import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
import useLoginUser from '#utils/useLoginUser.ts';

interface Template {
  title: string;
  messages: string[];
}

const SaveModal: React.FC<{
  value: string;
  revisionHistory: Revision<ExternalLabel>[];
  onHide: () => void;
  onOkClick: (props: any) => void;
}> = props => {
  const { revisionHistory, onHide, onOkClick } = props;
  const [value, setValue] = useState(props.value);
  const handleChange = (event: any) => {
    setValue(event.target.value);
  };
  const handleKeyDown = (event: React.KeyboardEvent<FormControl>) => {
    if (event.keyCode == keycode.codes.enter) {
      onOkClick(value);
    }
  };
  const handleSelectTemplate = (template: string) => {
    setValue(template);
  };

  const user = useLoginUser();
  const revisionMessageTemplates = user.preferences.revisionMessageTemplates;
  const templates: Template[] = revisionMessageTemplates
    ? [{ title: 'Saved templates', messages: revisionMessageTemplates }]
    : [];
  revisionHistory.length > 0 &&
    templates.push({
      title: 'Revision history',
      messages: Array.from(
        new Set(revisionHistory.map(revision => revision.description).sort())
      )
    });

  return (
    <StyledSaveModalDiv>
      <DialogHeader>Save</DialogHeader>
      <DialogBody>
        <label>Revision message</label>
        <FormControl
          type="text"
          data-autofocus
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {templates.length > 0 && (
          <DropdownButton
            id="revision-templates-dropdown"
            title={<Icon icon="material-replay" />}
          >
            {templates.map((template, index) => (
              <Fragment key={index}>
                {index !== 0 && <MenuItem divider />}
                <MenuItem header>{template.title}</MenuItem>
                {template.messages.map((message, i) => (
                  <MenuItem
                    key={i}
                    onClick={() => handleSelectTemplate(message)}
                  >
                    {message}
                  </MenuItem>
                ))}
              </Fragment>
            ))}
          </DropdownButton>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick(value)} variant="primary">
          OK
        </Button>
      </DialogFooter>
    </StyledSaveModalDiv>
  );
};

const StyledSaveModalDiv = styled.div`
  display: contents;
  input {
    width: 100%;
  }
  #revision-templates-dropdown {
    margin-top: 10px;
  }
`;

export default SaveModal;
