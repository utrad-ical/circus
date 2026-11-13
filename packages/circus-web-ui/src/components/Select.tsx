import type { Editor } from '#components/editorTypes.tsx';
import classnames from 'classnames';
import React, { type ComponentType, type ReactElement } from 'react';
import normalizeOptions, {
  type SelectOptions
} from '#utils/normalizeOptions.ts';
import type { ButtonSize, ButtonVariant } from './Button.tsx';
import DropdownButton from './DropdownButton.tsx';
import MenuItem from './MenuItem.tsx';
import styles from './Select.module.css';

const DefaultRenderer: ComponentType<{ caption: string }> = props => {
  const { caption } = props;
  return <>{caption}</>;
};

export type SelectProps<T extends string | number> = {
  options: SelectOptions;
  value: T;
  onChange?: (value: T) => void;
  defaultSelect?: T;
  renderer?: ComponentType<any>;
  numericalValue?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
  block?: boolean;
  disabled?: boolean;
  className?: string;
};

const Select = <T extends string | number = string>(
  props: SelectProps<T>
): ReactElement => {
  const {
    value,
    onChange,
    defaultSelect,
    renderer: Renderer = DefaultRenderer,
    numericalValue,
    size,
    variant,
    block,
    disabled,
    className
  } = props;
  const options = normalizeOptions(props.options);

  const title =
    value in options ? (
      <Renderer {...options[value]} />
    ) : defaultSelect !== undefined && defaultSelect in options ? (
      options[defaultSelect].caption
    ) : (
      <span className={styles.empty} />
    );

  const handleSelect = (key: string) => {
    onChange?.((numericalValue ? parseFloat(key) : key) as T);
  };

  // The wrapper also contains the menu, so `className` can style its items
  return (
    <span
      className={classnames(styles.select, block && styles.block, className)}
    >
      <DropdownButton
        title={title}
        size={size}
        variant={variant}
        disabled={disabled}
        onSelect={handleSelect}
      >
        {Object.keys(options).map(key => (
          <MenuItem
            key={key}
            eventKey={key}
            type="radio"
            checked={key === String(value)}
          >
            <Renderer {...options[key]} />
          </MenuItem>
        ))}
      </DropdownButton>
    </span>
  );
};

/** For `PropertyEditor` */
export const selectEditor = <T extends string | number = string>(
  options: SelectOptions,
  params: Partial<SelectProps<T>> = {}
): Editor<T> => {
  const SelectEditor: Editor<T> = props => {
    const { value, onChange, disabled } = props;
    return (
      <Select<T>
        options={options}
        {...params}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  };
  return SelectEditor;
};

export default Select;
