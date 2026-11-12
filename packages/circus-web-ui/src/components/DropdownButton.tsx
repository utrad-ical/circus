import React, {
  type FC,
  type KeyboardEvent,
  type MouseEvent,
  useMemo,
  useRef
} from 'react';
import moveMenuFocus from '#utils/menuKeyboard.ts';
import styles from './DropdownButton.module.css';
import { MenuContext } from './MenuItem.tsx';
import PopoverButton, { type PopoverButtonProps } from './PopoverButton.tsx';

const enabledItems = (menu: HTMLElement | null) =>
  Array.from(
    menu?.querySelectorAll<HTMLElement>(
      '[role^="menuitem"]:not([aria-disabled="true"])'
    ) ?? []
  );

/**
 * A button that opens a menu of `MenuItem`s.
 */
const DropdownButton: FC<
  PopoverButtonProps & {
    onSelect?: (eventKey: any, event: MouseEvent) => void;
  }
> = props => {
  const { onSelect, ...rest } = props;
  const menuRef = useRef<HTMLElement>(null);

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

  const handleOpen = (menu: HTMLElement) => {
    (
      menu.querySelector<HTMLElement>('[aria-checked="true"]') ??
      enabledItems(menu)[0]
    )?.focus();
  };

  const handleKeyDown = (ev: KeyboardEvent) => {
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

  return (
    <PopoverButton
      {...rest}
      popupRole="menu"
      popupAs="ul"
      popupClassName={styles.menu}
      popupRef={menuRef}
      onOpen={handleOpen}
      onPopupKeyDown={handleKeyDown}
    >
      <MenuContext.Provider value={context}>
        {rest.children}
      </MenuContext.Provider>
    </PopoverButton>
  );
};

export default DropdownButton;
