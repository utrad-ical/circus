import classnames from 'classnames';
import React, { type FC, type MouseEvent, type ReactNode } from 'react';
import Button, { type ButtonSize, type ButtonVariant } from './Button.tsx';
import DropdownButton from './DropdownButton.tsx';
import styles from './SplitButton.module.css';

/**
 * A button with an attached caret button that opens a menu.
 * Other props (e.g., event handlers given by a tooltip) go to the wrapper.
 */
const SplitButton: FC<{
  title: ReactNode;
  children: ReactNode;
  onClick?: (ev: MouseEvent) => void;
  onSelect?: (eventKey: any, event: MouseEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  align?: 'start' | 'end';
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}> = props => {
  const {
    title,
    children,
    onClick,
    onSelect,
    variant,
    size,
    align,
    disabled,
    className,
    ...rest
  } = props;
  return (
    <span className={classnames(styles.split, className)} {...rest}>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onClick}
      >
        {title}
      </Button>
      <DropdownButton
        title={null}
        variant={variant}
        size={size}
        align={align}
        disabled={disabled}
        onSelect={onSelect}
      >
        {children}
      </DropdownButton>
    </span>
  );
};

export default SplitButton;
