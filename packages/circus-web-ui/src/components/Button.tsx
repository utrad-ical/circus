import classnames from 'classnames';
import React, { type ButtonHTMLAttributes, forwardRef } from 'react';
import styles from './Button.module.css';
import Icon from './Icon.tsx';

export type ButtonVariant = 'primary' | 'default' | 'link' | 'danger';
export type ButtonSize = 'xsmall' | 'small' | 'large';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  pressed?: boolean;
  caret?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant = 'default',
    size,
    icon,
    pressed,
    caret,
    type = 'button',
    className,
    children,
    ...rest
  } = props;
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={classnames(
        styles.button,
        variant !== 'default' && styles[variant],
        size && styles[size],
        className
      )}
      {...rest}
    >
      {icon && <Icon icon={icon} />}
      {children}
      {caret && (
        <Icon icon="material-arrow_drop_down" className={styles.caret} />
      )}
    </button>
  );
});

export default Button;
