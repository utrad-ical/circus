import React, { type FC } from 'react';
import type { ButtonSize } from './Button.tsx';
import styles from './DateRangePicker.module.css';
import DropdownButton from './DropdownButton.tsx';
import MenuItem from './MenuItem.tsx';
import RelativeDatePicker, {
  normalizeRelative,
  type RelativeDate
} from './RelativeDatePicker.tsx';

const today: RelativeDate = [0, 'day'];

const presets: {
  [key: string]: { caption: string; from?: RelativeDate; to?: RelativeDate };
} = {
  today: { caption: 'Today', from: today, to: today },
  yesterday: { caption: 'Yesterday', from: [-1, 'day'], to: [-1, 'day'] },
  last2days: { caption: 'Last 2 days', from: [-1, 'day'], to: today },
  last1week: { caption: 'Last 1 Week', from: [-6, 'day'], to: today },
  last1month: { caption: 'Last 1 month', from: [-1, 'month'], to: today },
  last6months: { caption: 'Last 3 months', from: [-3, 'month'], to: today },
  last1year: { caption: 'Last 1 year', from: [-1, 'year'], to: today },
  all: { caption: 'All', from: null, to: null }
};

export interface DateRange {
  from: RelativeDate;
  to: RelativeDate;
}

const DateRangePicker: FC<{
  value: DateRange;
  onChange: (value: DateRange) => void;
  size?: ButtonSize;
  disabled?: boolean;
}> = props => {
  const { value, onChange, size, disabled } = props;
  const { from = null, to = null } = value ?? {};

  const presetSelect = (key: string) => {
    onChange({ from: presets[key].from || null, to: presets[key].to || null });
  };

  return (
    <span className={styles.picker}>
      <RelativeDatePicker
        value={from}
        onChange={date => onChange({ from: date, to })}
        size={size}
        disabled={disabled}
      />
      &mdash;
      <RelativeDatePicker
        value={to}
        onChange={date => onChange({ from, to: date })}
        size={size}
        disabled={disabled}
      />
      <DropdownButton
        title={null}
        variant="link"
        size={size}
        disabled={disabled}
        onSelect={presetSelect}
      >
        {Object.keys(presets).map(key => (
          <MenuItem key={key} eventKey={key}>
            {presets[key].caption}
          </MenuItem>
        ))}
      </DropdownButton>
    </span>
  );
};

export default DateRangePicker;

export const dateRangeToMongoQuery = (
  condition: DateRange,
  key: string
): { $and: any[] } | null => {
  const result: any = { $and: [] };
  const from = normalizeRelative(condition.from);
  if (from) result.$and.push({ [key]: { $gte: { $date: from } } });
  const to = normalizeRelative(condition.to, true);
  if (to) result.$and.push({ [key]: { $lt: { $date: to } } });
  return from || to ? result : null;
};
