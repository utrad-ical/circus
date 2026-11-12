import classnames from 'classnames';
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  getYear,
  isSameDay,
  isSameMonth,
  isSameYear,
  isValid,
  parse,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import React, {
  type FC,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import Button from './Button.tsx';
import styles from './Calendar.module.css';

const dateFormat = 'yyyy-MM-dd';
const yearsPerPage = 12;
// Grid width of each view, which is also the step of the up/down arrow keys
const viewColumns = { day: 7, month: 3, year: 3 } as const;
const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type View = keyof typeof viewColumns;

const parseValue = (value: string | undefined) => {
  if (!value) return null;
  const date = parse(value, dateFormat, new Date());
  return isValid(date) ? date : null;
};

const yearPageStart = (date: Date) =>
  Math.floor(getYear(date) / yearsPerPage) * yearsPerPage;

/**
 * A calendar to choose a date (`YYYY-MM-DD`).
 * Clicking the header zooms out to months and then to years.
 */
const Calendar: FC<{
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = props => {
  const { value, onChange, disabled } = props;
  const selected = parseValue(value);
  const [view, setView] = useState<View>('day');
  // The page shown (its month in the day view)
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  // The cell that has the roving tabindex
  const [focusedDate, setFocusedDate] = useState(() => selected ?? new Date());
  const focusedCellRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Set when the focused cell should take DOM focus after the next render
  const shouldFocusCell = useRef(false);

  useEffect(() => {
    if (!value) return;
    const date = parseValue(value);
    if (date) {
      setViewDate(date);
      setFocusedDate(date);
    }
  }, [value]);

  useLayoutEffect(() => {
    if (!shouldFocusCell.current) return;
    shouldFocusCell.current = false;
    focusedCellRef.current?.focus();
  });

  const navigate = (direction: number) => {
    const next =
      view === 'day'
        ? addMonths(viewDate, direction)
        : addYears(viewDate, view === 'month' ? direction : direction * 12);
    setViewDate(next);
    setFocusedDate(prev =>
      view === 'day'
        ? setMonth(setYear(prev, getYear(next)), next.getMonth())
        : setYear(prev, getYear(next))
    );
  };

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  useEffect(() => {
    const container = containerRef.current!;
    const handleWheel = (ev: WheelEvent) => {
      if (disabled) return;
      ev.preventDefault();
      if (ev.deltaY !== 0) navigateRef.current(ev.deltaY > 0 ? 1 : -1);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [disabled]);

  const zoomOut = () => setView(prev => (prev === 'day' ? 'month' : 'year'));

  // Selects a date in the day view, or zooms in one level
  const activate = (date: Date) => {
    if (view === 'day') {
      setFocusedDate(date);
      onChange(format(date, dateFormat));
      return;
    }
    setViewDate(date);
    setFocusedDate(
      view === 'month'
        ? setMonth(setYear(focusedDate, getYear(date)), date.getMonth())
        : setYear(focusedDate, getYear(date))
    );
    setView(view === 'month' ? 'day' : 'month');
    shouldFocusCell.current = true;
  };

  const step = (units: number) =>
    view === 'day'
      ? addDays(focusedDate, units)
      : view === 'month'
        ? addMonths(focusedDate, units)
        : addYears(focusedDate, units);

  const handleKeyDown = (ev: KeyboardEvent) => {
    const columns = viewColumns[view];
    let next: Date;
    switch (ev.key) {
      case 'ArrowLeft':
        next = step(-1);
        break;
      case 'ArrowRight':
        next = step(1);
        break;
      case 'ArrowUp':
        next = step(-columns);
        break;
      case 'ArrowDown':
        next = step(columns);
        break;
      case 'Home':
        next =
          view === 'day'
            ? startOfWeek(focusedDate)
            : view === 'month'
              ? setMonth(focusedDate, 0)
              : setYear(focusedDate, yearPageStart(focusedDate));
        break;
      case 'End':
        next =
          view === 'day'
            ? endOfWeek(focusedDate)
            : view === 'month'
              ? setMonth(focusedDate, 11)
              : setYear(
                  focusedDate,
                  yearPageStart(focusedDate) + yearsPerPage - 1
                );
        break;
      case 'PageUp':
      case 'PageDown': {
        const sign = ev.key === 'PageUp' ? -1 : 1;
        next =
          view === 'day'
            ? addMonths(focusedDate, sign * (ev.shiftKey ? 12 : 1))
            : addYears(
                focusedDate,
                sign * (view === 'month' ? 1 : yearsPerPage)
              );
        break;
      }
      case 'Enter':
      case ' ':
        ev.preventDefault();
        activate(focusedDate);
        return;
      case 'Backspace':
        ev.preventDefault();
        if (view !== 'year') zoomOut();
        return;
      default:
        return;
    }
    ev.preventDefault();
    shouldFocusCell.current = true;
    setFocusedDate(next);
    setViewDate(next);
  };

  const today = new Date();
  const cells =
    view === 'day'
      ? (() => {
          const end = endOfWeek(endOfMonth(viewDate));
          const days: Date[] = [];
          for (
            let d = startOfWeek(startOfMonth(viewDate));
            d <= end;
            d = addDays(d, 1)
          )
            days.push(d);
          return days.map(date => ({
            date,
            label: format(date, 'd'),
            selected: !!selected && isSameDay(date, selected),
            today: isSameDay(date, today),
            outside: !isSameMonth(date, viewDate),
            focused: isSameDay(date, focusedDate)
          }));
        })()
      : view === 'month'
        ? Array.from({ length: 12 }, (_, i) =>
            setMonth(startOfMonth(viewDate), i)
          ).map(date => ({
            date,
            label: format(date, 'MMM'),
            selected: !!selected && isSameMonth(date, selected),
            today: isSameMonth(date, today),
            outside: false,
            focused: isSameMonth(date, focusedDate)
          }))
        : Array.from({ length: yearsPerPage }, (_, i) =>
            setYear(startOfMonth(viewDate), yearPageStart(viewDate) + i)
          ).map(date => ({
            date,
            label: format(date, 'yyyy'),
            selected: !!selected && isSameYear(date, selected),
            today: isSameYear(date, today),
            outside: false,
            focused: isSameYear(date, focusedDate)
          }));

  const headerLabel =
    view === 'day'
      ? format(viewDate, 'MMMM yyyy')
      : view === 'month'
        ? format(viewDate, 'yyyy')
        : `${yearPageStart(viewDate)} - ${yearPageStart(viewDate) + yearsPerPage - 1}`;

  return (
    <div
      ref={containerRef}
      className={classnames(styles.calendar, disabled && styles.disabled)}
    >
      <div className={styles.header}>
        <Button
          variant="link"
          size="xsmall"
          icon="material-chevron_left"
          title="Previous"
          onClick={() => navigate(-1)}
        />
        <button
          type="button"
          className={styles.headerLabel}
          disabled={view === 'year'}
          onClick={zoomOut}
        >
          {headerLabel}
        </button>
        <Button
          variant="link"
          size="xsmall"
          icon="material-chevron_right"
          title="Next"
          onClick={() => navigate(1)}
        />
      </div>
      {view === 'day' && (
        <div className={styles.weekdays}>
          {weekdays.map(w => (
            <div key={w}>{w}</div>
          ))}
        </div>
      )}
      <div className={view === 'day' ? styles.days : styles.compact}>
        {cells.map(cell => (
          <button
            key={cell.date.getTime()}
            ref={cell.focused ? focusedCellRef : undefined}
            type="button"
            className={classnames(styles.cell, {
              [styles.wide]: view !== 'day',
              [styles.outside]: cell.outside,
              [styles.selected]: cell.selected,
              [styles.today]: cell.today
            })}
            tabIndex={cell.focused ? 0 : -1}
            aria-pressed={cell.selected}
            onClick={() => activate(cell.date)}
            onKeyDown={handleKeyDown}
          >
            {cell.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
