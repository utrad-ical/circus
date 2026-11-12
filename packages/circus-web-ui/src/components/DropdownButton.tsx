import classnames from 'classnames';
import React, {
  type CSSProperties,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import moveMenuFocus from '#utils/menuKeyboard.ts';
import Button, { type ButtonSize, type ButtonVariant } from './Button.tsx';
import styles from './DropdownButton.module.css';
import { MenuContext } from './MenuItem.tsx';

let counter = 0;

const enabledItems = (menu: HTMLElement | null) =>
  Array.from(
    menu?.querySelectorAll<HTMLElement>(
      '[role^="menuitem"]:not([aria-disabled="true"])'
    ) ?? []
  );

/**
 * A button that opens a menu of `MenuItem`s.
 * The menu is a popover placed with CSS anchor positioning.
 */
const DropdownButton: FC<{
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
  onSelect?: (eventKey: any, event: MouseEvent) => void;
}> = props => {
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
    onSelect
  } = props;
  const [menuId] = useState(() => `circus-dropdown-${++counter}`);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const menu = menuRef.current!;
    const handleToggle = (ev: Event) => {
      const isOpen = (ev as Event & { newState: string }).newState === 'open';
      setOpen(isOpen);
      if (isOpen)
        (
          menu.querySelector<HTMLElement>('[aria-checked="true"]') ??
          enabledItems(menu)[0]
        )?.focus();
    };
    menu.addEventListener('toggle', handleToggle);
    return () => menu.removeEventListener('toggle', handleToggle);
  }, []);

  const context = useMemo(
    () => ({
      select: (
        eventKey: string | number | undefined,
        event: MouseEvent,
        keepOpen?: boolean
      ) => {
        if (eventKey !== undefined) onSelect?.(eventKey, event);
        if (!keepOpen) menuRef.current?.hidePopover();
      }
    }),
    [onSelect]
  );

  const handleTriggerKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown' && !disabled) {
      ev.preventDefault();
      menuRef.current?.showPopover();
    }
  };

  const handleMenuKeyDown = (ev: KeyboardEvent) => {
    // Other content (e.g., a table of links) keeps the normal Tab order
    if (
      ev.key === 'Tab' &&
      (ev.target as HTMLElement).role?.startsWith('menuitem')
    ) {
      menuRef.current?.hidePopover();
    } else if (moveMenuFocus(enabledItems(menuRef.current), ev.key)) {
      ev.preventDefault();
    }
  };

  const handleMenuBlur = (ev: FocusEvent) => {
    const next = ev.relatedTarget as Node | null;
    if (next && !menuRef.current?.contains(next) && next !== triggerRef.current)
      menuRef.current?.hidePopover();
  };

  const anchor = { '--dropdown-anchor': `--${menuId}` } as CSSProperties;

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
        aria-haspopup="menu"
        aria-expanded={open}
        caret={!noCaret}
        onKeyDown={handleTriggerKeyDown}
        {...{ popovertarget: menuId }}
      >
        {title}
      </Button>
      <ul
        ref={menuRef}
        id={menuId}
        role="menu"
        className={classnames(styles.menu, align === 'end' && styles.end)}
        style={anchor}
        onKeyDown={handleMenuKeyDown}
        onBlur={handleMenuBlur}
        {...{ popover: 'auto' }}
      >
        <MenuContext.Provider value={context}>{children}</MenuContext.Provider>
      </ul>
    </>
  );
};

export default DropdownButton;
