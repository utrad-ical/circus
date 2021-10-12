import Icon from 'components/Icon';
import {
  Button,
  Dropdown,
  FormControl,
  MenuItem,
  Modal
} from 'components/react-bootstrap';
import keycode from 'keycode';
import { ExternalLabel } from 'pages/case-detail/labelData';
import { Revision } from 'pages/case-detail/revisionData';
import React, { Fragment, useState } from 'react';
import DropdownToggle from 'react-bootstrap/lib/DropdownToggle';
import styled from 'styled-components';
import useLoginUser from 'utils/useLoginUser';

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
      <Modal.Header>Save</Modal.Header>
      <Modal.Body>
        <label>Revision message</label>
        <FormControl
          type="text"
          autoFocus
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {templates.length > 0 && (
          <Dropdown id="revision-templates-dropdown">
            <DropdownToggle>
              <Icon icon="glyphicon-repeat" />
            </DropdownToggle>
            <Dropdown.Menu>
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
            </Dropdown.Menu>
          </Dropdown>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick(value)} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </StyledSaveModalDiv>
  );
};

const StyledSaveModalDiv = styled.div`
  input {
    width: 100%;
  }
  #revision-templates-dropdown {
    margin-top: 10px;
  }
`;

export default SaveModal;
