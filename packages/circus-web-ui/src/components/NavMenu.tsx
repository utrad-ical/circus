import classNames from 'classnames';
import React, { type FC, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.tsx';
import styles from './NavMenu.module.css';

/**
 * An item of the app bar, optionally with a drop-down menu
 * shown on hover or focus.
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
  const caption = (
    <>
      <Icon icon={icon} className={styles.icon} />
      <span className={styles.name}>{name}</span>
    </>
  );

  return (
    <li
      className={classNames(
        styles.item,
        align === 'end' && styles.end,
        className
      )}
    >
      {link ? (
        <Link to={link} className={styles.caption}>
          {caption}
        </Link>
      ) : onClick ? (
        <a onClick={onClick} href="#" className={styles.caption}>
          {caption}
        </a>
      ) : (
        <span tabIndex={0} className={styles.caption}>
          {caption}
        </span>
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
        <a href={link} target="_blank" rel="noreferrer">
          {content}
        </a>
      ) : (
        <Link to={link}>{content}</Link>
      )}
    </li>
  );
};

export const NavMenuHeader: FC<{ children: ReactNode }> = props => {
  const { children } = props;
  return <li className={styles.menuHeader}>{children}</li>;
};

export default NavMenu;
