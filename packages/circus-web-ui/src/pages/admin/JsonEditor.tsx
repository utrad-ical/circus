import classnames from 'classnames';
import React, { useState } from 'react';
import styles from './JsonEditor.module.css';

const JsonEditor: React.FC<{
  value: any;
  onChange: (value: any) => void;
}> = props => {
  const { value, onChange } = props;
  const [input, setInput] = useState(() => JSON.stringify(value, null, '  '));
  const [hasError, setHasError] = useState(false);

  const handleChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      setInput(ev.target.value);
      const parsed = JSON.parse(ev.target.value);
      setHasError(false);
      onChange(parsed);
    } catch (err) {
      setHasError(true);
    }
  };

  return (
    <textarea
      className={classnames(styles.textArea, hasError && styles.hasError)}
      value={input}
      onChange={handleChange}
    />
  );
};

export default JsonEditor;
