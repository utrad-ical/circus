import classnames from 'classnames';
import React, { memo, type ReactElement } from 'react';
import type { Editor } from './editorTypes.tsx';
import styles from './PropertyEditor.module.css';

export interface PropertyEditorProperty<K, V> {
  key: K;
  editor: Editor<V>;
  caption?: string;
  className?: string;
}

// A string is shown as a heading
export type PropertyEditorProperties<P extends object> = (
  | string
  | { [K in keyof P]: PropertyEditorProperty<K, P[K]> }[keyof P]
)[];

interface Props<P extends object> {
  properties: PropertyEditorProperties<P>;
  value: P;
  complaints?: { [key in keyof P]?: string };
  onChange: (value: P, key: keyof P) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Edits the properties of an object, one row (caption and editor) for each.
 */
const PropertyEditor = <P extends object>(props: Props<P>): ReactElement => {
  const {
    properties,
    value,
    complaints,
    onChange,
    disabled = false,
    className
  } = props;

  const handleChange = <K extends keyof P>(key: K, val: P[K]) => {
    if (disabled) return;
    onChange({ ...value, [key]: val }, key);
  };

  return (
    <div className={classnames(styles.editor, className)}>
      {properties.map(property => {
        if (typeof property === 'string') {
          return (
            <h3 key={'heading:' + property} className={styles.heading}>
              {property}
            </h3>
          );
        }
        const { key, editor: Component, caption, className } = property;
        const complaint = complaints?.[key];
        return (
          <div
            key={key as string}
            className={classnames(
              styles.row,
              complaint !== undefined && styles.invalid,
              className
            )}
          >
            <label className={styles.caption}>{caption ?? String(key)}</label>
            <div className={styles.value}>
              <Component
                disabled={disabled}
                value={value[key]}
                onChange={val => handleChange(key, val)}
              />
              {complaint !== undefined && (
                <div className={styles.complaint}>{complaint}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(PropertyEditor) as typeof PropertyEditor;
