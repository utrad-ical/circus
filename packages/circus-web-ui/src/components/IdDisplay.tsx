import React, { memo } from 'react';
import CopyToClipboardButton from './CopyToClipboardButton.tsx';
import Icon from './Icon.tsx';
import styles from './IdDisplay.module.css';
import PopoverButton from './PopoverButton.tsx';

const IdDisplay = memo<{ value: { [key: string]: string } }>(props => {
  const { value } = props;
  return (
    <PopoverButton
      title={<Icon icon="material-zoom_in" />}
      variant="link"
      size="xsmall"
      noCaret
      popupRole="dialog"
      popupClassName={styles.popup}
    >
      {Object.keys(value).map(key => (
        <div key={key}>
          <b>{key}:</b> {value[key]}
          <CopyToClipboardButton size="xsmall" string={value[key]} />
        </div>
      ))}
    </PopoverButton>
  );
});

export default IdDisplay;
