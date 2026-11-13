import React, { type FC, useContext } from 'react';
import type { ButtonSize } from './Button.tsx';
import Calendar from './Calendar.tsx';
import PopoverButton, { PopoverContext } from './PopoverButton.tsx';
import styles from './DatePicker.module.css';

const ClosingCalendar: FC<{
  value: string;
  onChange: (value: string) => void;
}> = props => {
  const { value, onChange } = props;
  const { hide } = useContext(PopoverContext);
  return (
    <Calendar
      value={value}
      onChange={v => {
        onChange(v);
        hide();
      }}
    />
  );
};

/**
 * A button to choose a date (`YYYY-MM-DD`) from a calendar.
 */
const DatePicker: FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: ButtonSize;
  className?: string;
}> = props => {
  const { value, onChange, disabled, size, className } = props;
  return (
    <PopoverButton
      title={value || '(Not set)'}
      size={size}
      disabled={disabled}
      className={className}
      popupRole="dialog"
      popupClassName={styles.popup}
    >
      <ClosingCalendar value={value} onChange={onChange} />
    </PopoverButton>
  );
};

export default DatePicker;
