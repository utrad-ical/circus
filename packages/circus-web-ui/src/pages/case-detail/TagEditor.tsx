import React, { useState, useMemo } from 'react';
import { OverlayTrigger, Popover } from 'components/react-bootstrap';
import IconButton from 'components/IconButton';
import { PhysicalTag } from 'components/Tag';
import Project from 'types/Project';
import styled from 'styled-components';

const TagEditor: React.FC<{
  projectData: Project;
  value: string[];
  onChange: (value: string[]) => void;
}> = props => {
  const { projectData, value, onChange } = props;

  const [editingValue, setEditingValue] = useState(value);

  const handleChange = (tag: string, checked: boolean) => {
    const newValue = editingValue.filter(t => t !== tag);
    if (checked) newValue.push(tag);
    setEditingValue(newValue);
  };

  const handleExited = () => {
    if (value !== editingValue) {
      onChange(editingValue);
    }
  };

  const overlay = (
    <Popover id="tag-popover">
      <StyledUl>
        {projectData.tags.map(tag => {
          return (
            <li key={tag.name}>
              <label>
                <input
                  type="checkbox"
                  checked={editingValue.indexOf(tag.name) >= 0}
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange(tag.name, ev.target.checked)
                  }
                />
                <PhysicalTag name={tag.name} color={tag.color} />
              </label>
            </li>
          );
        })}
      </StyledUl>
    </Popover>
  );

  return (
    <OverlayTrigger
      trigger="click"
      rootClose
      overlay={overlay}
      placement="bottom"
      onEnter={() => setEditingValue(value)}
      onExited={handleExited}
    >
      <IconButton icon="circus-tool" bsStyle="link" bsSize="sm" />
    </OverlayTrigger>
  );
};

const StyledUl = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    padding: 3px 0;
  }
  input {
    margin: 0 5px;
  }
`;

export default TagEditor;
