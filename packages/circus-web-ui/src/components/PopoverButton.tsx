import classnames from 'classnames';
import React, {
  createContext,
  type CSSProperties,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Button, { type ButtonSize, type ButtonVariant } from './Button.tsx';
import styles from './PopoverButton.module.css';

let counter = 0;

/** Lets the content of a popover close it (e.g., after a choice is made) */
export const PopoverContext = createContext<{ hide: () => void }>({
  hide: () => {}
});

export type PopoverButtonProps = {
  title: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  noCaret?: boolean;
};

/**
 * A button that opens a popover placed below it with CSS anchor positioning.
 * The browser handles opening, light dismiss and Escape.
 */
const PopoverButton: FC<
  PopoverButtonProps & {
    popupRole: 'menu' | 'dialog';
    popupAs?: 'div' | 'ul';
    popupClassName?: string;
    popupRef?: RefObject<HTMLElement | null>;
    onOpen?: (popup: HTMLElement) => void;
    onPopupKeyDown?: (ev: KeyboardEvent) => void;
  }
> = props => {
  const {
    title,
    children,
    align = 'start',
    variant,
    size,
    disabled,
    id,
    className,
    style,
    noCaret,
    popupRole,
    popupAs: Popup = 'div',
    popupClassName,
    popupRef: givenPopupRef,
    onOpen,
    onPopupKeyDown
  } = props;
  const [popupId] = useState(() => `circus-popover-${++counter}`);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ownPopupRef = useRef<HTMLElement>(null);
  const popupRef = givenPopupRef ?? ownPopupRef;

  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const popup = popupRef.current!;
    const handleToggle = (ev: Event) => {
      const isOpen = (ev as Event & { newState: string }).newState === 'open';
      setOpen(isOpen);
      if (isOpen) onOpenRef.current?.(popup);
    };
    popup.addEventListener('toggle', handleToggle);
    return () => popup.removeEventListener('toggle', handleToggle);
  }, [popupRef]);

  const context = useMemo(
    () => ({ hide: () => popupRef.current?.hidePopover() }),
    [popupRef]
  );

  const handleTriggerKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown' && !disabled) {
      ev.preventDefault();
      popupRef.current?.showPopover();
    }
  };

  const handlePopupBlur = (ev: FocusEvent) => {
    const next = ev.relatedTarget as Node | null;
    if (
      next &&
      !popupRef.current?.contains(next) &&
      next !== triggerRef.current
    )
      popupRef.current?.hidePopover();
  };

  const anchor = { '--popover-anchor': `--${popupId}` } as CSSProperties;

  return (
    <>
      <Button
        ref={triggerRef}
        id={id}
        variant={variant}
        size={size}
        disabled={disabled}
        className={classnames(styles.trigger, className)}
        style={{ ...anchor, ...style }}
        aria-haspopup={popupRole}
        aria-expanded={open}
        caret={!noCaret}
        onKeyDown={handleTriggerKeyDown}
        {...{ popovertarget: popupId }}
      >
        {title}
      </Button>
      <Popup
        ref={popupRef as RefObject<any>}
        id={popupId}
        role={popupRole}
        className={classnames(
          styles.popup,
          align === 'end' && styles.end,
          popupClassName
        )}
        style={anchor}
        onKeyDown={onPopupKeyDown}
        onBlur={handlePopupBlur}
        {...{ popover: 'auto' }}
      >
        <PopoverContext.Provider value={context}>
          {children}
        </PopoverContext.Provider>
      </Popup>
    </>
  );
};

export default PopoverButton;
