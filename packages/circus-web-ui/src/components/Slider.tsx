import classnames from 'classnames';
import React, {
  type FC,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState
} from 'react';
import styles from './Slider.module.css';

export interface SliderProps {
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  className?: string;
  block?: boolean;
  'aria-label'?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const valueToPercent = (value: number, min: number, max: number) =>
  clamp(((value - min) / (max - min)) * 100, 0, 100);

/**
 * A horizontal slider. Drag the thumb or click the track to change the value;
 * the arrow keys, Page Up/Down, Home and End work while it has focus.
 */
const Slider: FC<
  SliderProps & { value: number; onChange: (value: number) => void }
> = props => {
  const {
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    disabled,
    className,
    block,
    'aria-label': ariaLabel
  } = props;
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const snap = (v: number) => {
    const snapped = min + Math.round((v - min) / step) * step;
    // Avoids floating point noise such as 0.30000000000000004
    return clamp(Number(snapped.toFixed(10)), min, max);
  };

  const changeTo = (v: number) => {
    const next = snap(v);
    if (next !== value) onChange(next);
  };

  const valueAt = (clientX: number) => {
    const { left, width } = trackRef.current!.getBoundingClientRect();
    return min + clamp((clientX - left) / width, 0, 1) * (max - min);
  };

  const handlePointerDown = (ev: PointerEvent<HTMLDivElement>) => {
    if (disabled || ev.button !== 0) return;
    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    thumbRef.current?.focus();
    setDragging(true);
    changeTo(valueAt(ev.clientX));
  };

  const handlePointerMove = (ev: PointerEvent<HTMLDivElement>) => {
    if (dragging) changeTo(valueAt(ev.clientX));
  };

  const handlePointerUp = () => setDragging(false);

  const handleKeyDown = (ev: KeyboardEvent) => {
    if (disabled) return;
    const bigStep = Math.max(step, (max - min) / 10);
    const next = {
      ArrowLeft: value - step,
      ArrowDown: value - step,
      ArrowRight: value + step,
      ArrowUp: value + step,
      PageDown: value - bigStep,
      PageUp: value + bigStep,
      Home: min,
      End: max
    }[ev.key];
    if (next === undefined) return;
    ev.preventDefault();
    changeTo(next);
  };

  const percent = valueToPercent(value, min, max);

  return (
    <div
      className={classnames(
        styles.slider,
        { [styles.block]: block, [styles.disabled]: disabled },
        className
      )}
    >
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={thumbRef}
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-disabled={disabled}
          tabIndex={disabled ? undefined : 0}
          className={classnames(styles.thumb, dragging && styles.dragging)}
          style={{ left: percent + '%' }}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

export default Slider;
