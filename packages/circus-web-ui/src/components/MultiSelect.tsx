import type { Editor } from '@smikitky/rb-components/lib/editor-types';
import classnames from 'classnames';
import React, { type ComponentType, type FC, Fragment } from 'react';
import normalizeOptions, {
  type SelectOptions
} from '#utils/normalizeOptions.ts';
import DropdownButton from './DropdownButton.tsx';
import MenuItem from './MenuItem.tsx';
import styles from './MultiSelect.module.css';

const DefaultRenderer: ComponentType<{
  caption: string;
  renderAs?: string;
}> = props => {
  const { caption } = props;
  return <>{caption}</>;
};

export type MultiSelectProps = {
  options: SelectOptions;
  value: any[];
  onChange?: (value: any[]) => void;
  renderer?: ComponentType<any>;
  numericalValue?: boolean;
  type?: 'dropdown' | 'checkbox';
  showSelectedMax?: number;
  glue?: string;
  noneText?: string;
  disabled?: boolean;
  className?: string;
};

const MultiSelect: FC<MultiSelectProps> = props => {
  const {
    value = [],
    onChange,
    renderer: Renderer = DefaultRenderer,
    numericalValue,
    type = 'dropdown',
    showSelectedMax = 3,
    glue = ', ',
    noneText = '(None)',
    disabled,
    className
  } = props;
  const options = normalizeOptions(props.options);
  const keys = Object.keys(options);
  // Values may be numbers while keys are strings
  const isChecked = (key: string) => value.some(v => String(v) === key);

  const handleToggle = (key: string) => {
    const toggled = keys
      .filter(k => (k === key ? !isChecked(k) : isChecked(k)))
      .map(k => (numericalValue ? parseFloat(k) : k));
    onChange?.(toggled);
  };

  if (type === 'checkbox') {
    return (
      <ul className={classnames(styles.checkboxes, className)}>
        {keys.map(key => (
          <li key={key}>
            <label>
              <input
                type="checkbox"
                checked={isChecked(key)}
                disabled={disabled}
                onChange={() => handleToggle(key)}
              />
              <Renderer {...options[key]} renderAs="select" />
            </label>
          </li>
        ))}
      </ul>
    );
  }

  const selected = keys.filter(isChecked);
  const title =
    selected.length === 0
      ? noneText
      : selected.length > showSelectedMax
        ? `${selected.length} selected`
        : selected.map((key, i) => (
            <Fragment key={key}>
              {i > 0 && glue}
              <Renderer {...options[key]} renderAs="list" />
            </Fragment>
          ));

  return (
    <span className={classnames(styles.select, className)}>
      <DropdownButton title={title} disabled={disabled} onSelect={handleToggle}>
        {keys.map(key => (
          <MenuItem
            key={key}
            eventKey={key}
            type="checkbox"
            checked={isChecked(key)}
          >
            <Renderer {...options[key]} renderAs="select" />
          </MenuItem>
        ))}
      </DropdownButton>
    </span>
  );
};

/** For `PropertyEditor` */
export const multiSelectEditor = (
  options: SelectOptions,
  params: Partial<MultiSelectProps> = {}
): Editor<any[]> => {
  const MultiSelectEditor: Editor<any[]> = props => {
    const { value, onChange, disabled } = props;
    return (
      <MultiSelect
        options={options}
        {...params}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  };
  return MultiSelectEditor;
};

export default MultiSelect;
