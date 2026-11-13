import classNames from 'classnames';
import React from 'react';
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from 'react';
import styles from './formField.module.css';

// Form parts of the built-in displays, colored with the host's design tokens

export const Field = (props: HTMLAttributes<HTMLDivElement>) => {
  const { className, ...rest } = props;
  return <div className={classNames(styles.field, className)} {...rest} />;
};

export const FieldLabel = (props: {
  as?: 'label' | 'div';
  className?: string;
  children?: ReactNode;
}) => {
  const { as: Tag = 'label', className, children } = props;
  return (
    <Tag className={classNames(styles.fieldLabel, className)}>{children}</Tag>
  );
};

// Can be placed inside `FieldLabel`
export const TextInput = (props: InputHTMLAttributes<HTMLInputElement>) => {
  const { className, ...rest } = props;
  return (
    <input className={classNames(styles.textInput, className)} {...rest} />
  );
};

export const SelectInput = (props: SelectHTMLAttributes<HTMLSelectElement>) => {
  const { className, ...rest } = props;
  return (
    <select className={classNames(styles.selectInput, className)} {...rest} />
  );
};
