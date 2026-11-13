import Icon from '#components/Icon.tsx';
import PopoverButton from '#components/PopoverButton.tsx';
import React, { useState, useMemo } from 'react';
import { PhysicalTag } from '#components/Tag.tsx';
import type Project from '#types/Project.ts';
import styles from './TagEditor.module.css';

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

  return (
    <PopoverButton
      title={<Icon icon="circus-tool" />}
      variant="link"
      size="small"
      noCaret
      popupRole="dialog"
      popupClassName="tag-popover"
      onOpen={() => setEditingValue(value)}
      onClose={handleExited}
    >
      <ul className={styles.tagList}>
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
      </ul>
    </PopoverButton>
  );
};

export default TagEditor;
