import classNames from 'classnames';
import React, {
  type FC,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
  useState
} from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.tsx';
import styles from './NavMenu.module.css';

/**
 * An item of the app bar, optionally with a drop-down menu.
 * The menu opens on hover, or with the down arrow key from the keyboard.
 */
const NavMenu: FC<{
  name: string;
  icon?: string;
  link?: string;
  onClick?: (ev: MouseEvent) => void;
  children?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}> = props => {
  const {
    name,
    icon = `circus-${props.name.toLowerCase()}`,
    link,
    onClick,
    children,
    align = 'start',
    className
  } = props;
  const [open, setOpen] = useState(false);
  const itemRef = useRef<HTMLLIElement>(null);

  const menuItems = () =>
    Array.from(
      itemRef.current?.querySelectorAll<HTMLElement>(
        `.${styles.dropdown} :is(a, button)`
      ) ?? []
    );

  const handleKeyDown = (ev: KeyboardEvent) => {
    if (!children) return;
    const items = menuItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      setOpen(true);
      const next =
        index < 0
          ? 0
          : (index + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) %
            items.length;
      // Wait until the menu is shown
      requestAnimationFrame(() => menuItems()[next]?.focus());
    } else if (ev.key === 'Escape' && open) {
      setOpen(false);
      itemRef.current
        ?.querySelector<HTMLElement>(`.${styles.caption}`)
        ?.focus();
    }
  };

  const handleBlur = (ev: FocusEvent) => {
    if (!itemRef.current?.contains(ev.relatedTarget as Node)) setOpen(false);
  };

  const caption = (
    <>
      <Icon icon={icon} className={styles.icon} />
      <span className={styles.name}>{name}</span>
    </>
  );
  const captionProps = {
    className: styles.caption,
    ...(children && { 'aria-haspopup': true, 'aria-expanded': open })
  };

  return (
    <li
      ref={itemRef}
      className={classNames(
        styles.item,
        align === 'end' && styles.end,
        open && styles.open,
        className
      )}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {link ? (
        <Link to={link} {...captionProps}>
          {caption}
        </Link>
      ) : onClick ? (
        <a onClick={onClick} href="#" {...captionProps}>
          {caption}
        </a>
      ) : (
        <button type="button" {...captionProps}>
          {caption}
        </button>
      )}
      {children && <ul className={styles.dropdown}>{children}</ul>}
    </li>
  );
};

export const NavSubMenu: FC<{
  link: string;
  icon?: string;
  name: string;
  nested?: boolean;
  external?: boolean;
}> = props => {
  const { link, icon, name, nested, external } = props;
  const content = (
    <>
      {icon && <Icon icon={icon} />}&ensp;{name}
    </>
  );
  return (
    <li className={classNames(styles.subMenu, nested && styles.nested)}>
      {external ? (
        <a href={link} target="_blank" rel="noreferrer" tabIndex={-1}>
          {content}
        </a>
      ) : (
        <Link to={link} tabIndex={-1}>
          {content}
        </Link>
      )}
    </li>
  );
};

export const NavMenuHeader: FC<{ children: ReactNode }> = props => {
  const { children } = props;
  return <li className={styles.menuHeader}>{children}</li>;
};

export default NavMenu;
