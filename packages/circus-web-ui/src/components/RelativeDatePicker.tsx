import { add, format, parse, startOfDay } from 'date-fns';
import React, { type FC, type ChangeEvent, memo, useState } from 'react';
import Button, { type ButtonSize } from './Button.tsx';
import Calendar from './Calendar.tsx';
import Input from './Input.tsx';
import PopoverButton from './PopoverButton.tsx';
import styles from './RelativeDatePicker.module.css';

export type RelativeDate =
  | null
  | string
  | [number, 'day' | 'week' | 'month' | 'year'];

type Mode = 'all' | 'absolute' | 'relative';

const dateFormat = 'yyyy-MM-dd';

const dateToString = (input: RelativeDate): string => {
  if (typeof input === 'string') return input;
  if (input === null) return '(All)';
  const [delta, unit] = input;
  if (unit === 'day') {
    if (delta === 0) return 'Today';
    if (delta === -1) return 'Yesterday';
  }
  const unitStr = Math.abs(delta) > 1 ? unit + 's' : unit;
  return delta < 0
    ? `${-delta} ${unitStr} ago`
    : `${delta} ${unitStr} from now`;
};

const modeOf = (value: RelativeDate): Mode =>
  value === null ? 'all' : Array.isArray(value) ? 'relative' : 'absolute';

const RelativeDatePicker: FC<{
  value: RelativeDate;
  onChange: (value: RelativeDate) => void;
  disabled?: boolean;
  size?: ButtonSize;
}> = props => {
  const { value, onChange, disabled, size } = props;
  const [mode, setMode] = useState<Mode>('all');

  const handleChangeMode = (mode: Mode) => {
    if (mode === 'relative') onChange([0, 'day']);
    else if (mode === 'all') onChange(null);
    else onChange(format(new Date(), dateFormat));
    setMode(mode);
  };

  const handleRelativeValueChange = (ev: ChangeEvent<HTMLInputElement>) => {
    onChange([-Number(ev.target.value), 'day']);
  };

  return (
    <PopoverButton
      title={dateToString(value)}
      size={size}
      disabled={disabled}
      popupRole="dialog"
      onOpen={() => setMode(modeOf(value))}
    >
      <div className={styles.editor}>
        <div className={styles.modes}>
          {(['relative', 'absolute', 'all'] as Mode[]).map(m => (
            <Button
              key={m}
              size="xsmall"
              variant={mode === m ? 'primary' : 'default'}
              onClick={() => handleChangeMode(m)}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </Button>
          ))}
        </div>
        {mode !== 'all' && (
          <div className={styles.switch}>
            {mode === 'relative' ? (
              <div className={styles.relative}>
                <Input
                  size="small"
                  type="number"
                  min={0}
                  value={Array.isArray(value) ? -value[0] : 0}
                  onChange={handleRelativeValueChange}
                />
                &ensp;days ago
              </div>
            ) : (
              <Calendar
                value={typeof value === 'string' ? value : undefined}
                onChange={onChange}
              />
            )}
          </div>
        )}
      </div>
    </PopoverButton>
  );
};

/**
 * Returns the start of the day in the local time,
 * or the start of the next day if `asMax` is true.
 */
export const normalizeRelative = (
  dateValue: RelativeDate,
  asMax: boolean = false
): Date | null => {
  if (dateValue === null) return null;
  const date =
    typeof dateValue === 'string'
      ? parse(dateValue, dateFormat, new Date())
      : add(startOfDay(new Date()), { [dateValue[1] + 's']: dateValue[0] });
  return asMax ? add(date, { days: 1 }) : date;
};

export default memo(RelativeDatePicker);
