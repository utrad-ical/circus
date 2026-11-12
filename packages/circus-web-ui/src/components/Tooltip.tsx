import React, {
  type CSSProperties,
  type FC,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react';
import styles from './Tooltip.module.css';

let counter = 0;

/**
 * Shows `content` above the children while they are hovered or focused.
 */
const Tooltip: FC<{
  content: ReactNode;
  delay?: number;
  children: ReactNode;
}> = props => {
  const { content, delay = 0, children } = props;
  const [tooltipId] = useState(() => `circus-tooltip-${++counter}`);
  const targetRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isOpen = () => !!tooltipRef.current?.matches(':popover-open');

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!isOpen()) tooltipRef.current?.showPopover();
    }, delay);
  };

  const hide = () => {
    clearTimeout(timer.current);
    if (isOpen()) tooltipRef.current?.hidePopover();
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // ARIA relationships are not inherited, so the description is attached to
  // the controls that actually get focus (not to those inside a popover)
  useEffect(() => {
    const controls = targetRef.current!.querySelectorAll<HTMLElement>(
      ':is(button, a[href], input, select, textarea, [tabindex]):not([tabindex="-1"])'
    );
    for (const control of controls) {
      if (!control.closest('[popover]'))
        control.setAttribute('aria-describedby', tooltipId);
    }
  });

  const anchor = { '--tooltip-anchor': `--${tooltipId}` } as CSSProperties;

  return (
    <span
      ref={targetRef}
      className={styles.target}
      style={anchor}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onPointerDown={hide}
    >
      {children}
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className={styles.tooltip}
        style={anchor}
        {...{ popover: 'manual' }}
      >
        {content}
      </div>
    </span>
  );
};

export default Tooltip;
