import moment from 'moment';
import React, { type FC, type ChangeEvent, memo, useState } from 'react';
import Button, { type ButtonSize } from './Button.tsx';
import Calendar from './Calendar.tsx';
import PopoverButton from './PopoverButton.tsx';
import styles from './RelativeDatePicker.module.css';

export type RelativeDate =
  | null
  | string
  | [number, 'day' | 'week' | 'month' | 'year'];

type Mode = 'all' | 'absolute' | 'relative';

export const defaultDateFormat = 'YYYY-MM-DD';

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
    else onChange(moment().format(defaultDateFormat));
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
                <input
                  className="form-control input-sm"
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
 * @param asMax Returns the end of the day if true, the start of the day if false
 * @param asUtc Returns the UTC if true, the local time if false
 */
export const normalizeRelative = (
  dateValue: RelativeDate,
  asMax: boolean = false,
  asUtc: boolean = false
): moment.Moment | null => {
  const createMoment = (value?: Exclude<RelativeDate, null>) => {
    if (asUtc) return value ? moment.utc(value) : moment.utc();
    return value ? moment(value) : moment();
  };
  if (typeof dateValue === 'string') {
    const result = createMoment(dateValue);
    return asMax ? result.add(1, 'day') : result;
  } else if (Array.isArray(dateValue)) {
    const result = createMoment()
      .startOf('day')
      .add(dateValue[0], dateValue[1]);
    return asMax ? result.add(1, 'day') : result;
  }
  return null;
};

export default memo(RelativeDatePicker);
