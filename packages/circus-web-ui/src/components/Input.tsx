import classnames from 'classnames';
import React, { type FC, type InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: 'small';
};

/**
 * A text-like `<input>` as tall as `Button`. It fills the width by default.
 */
const Input: FC<InputProps> = props => {
  const { size, className, ...rest } = props;
  return (
    <input
      type="text"
      {...rest}
      className={classnames(styles.input, size && styles[size], className)}
    />
  );
};

export default Input;
